import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyze page screenshot and context, then decide next action using Claude
 * @param {Buffer} screenshot - Screenshot buffer
 * @param {Object} context - Page context information
 * @returns {Promise<{action: string, target?: string, value?: string, reasoning: string}>}
 */
export async function analyzeAndAct(screenshot, context) {
  try {
    const { url, title, viewport, previousActions = [] } = context;

    // Convert screenshot buffer to base64
    const screenshotBase64 = screenshot.toString('base64');

    const systemPrompt = `You are an intelligent browser testing agent. Your goal is to thoroughly test websites by:
1. Navigating through different pages and sections
2. Testing interactive elements (buttons, links, forms)
3. Identifying broken links, errors, or accessibility issues
4. Checking page load performance and console errors

Analyze the screenshot and page context, then decide the next action to take.

Available actions:
- click: Click on an element (provide CSS selector as target)
- type: Type text into an input field (provide selector as target, text as value)
- scroll: Scroll the page (provide "down" or "up" as target)
- navigate: Navigate to a different URL (provide URL as target)
- wait: Wait for some time in milliseconds (provide duration as value)
- complete: Testing is complete

Respond with a JSON object containing:
{
  "action": "action_name",
  "target": "css_selector_or_url_or_direction",
  "value": "text_to_type_or_duration",
  "reasoning": "explanation of why you're taking this action"
}`;

    const viewportStr = viewport ? `${viewport.width}x${viewport.height}` : '1280x720 (default)';
    const userPrompt = `Current URL: ${url}
Page Title: ${title || 'Unknown'}
Viewport: ${viewportStr}
Previous Actions: ${previousActions.length > 0 ? previousActions.slice(-5).join(', ') : 'None'}

Analyze this screenshot and decide what to test next. Focus on:
- Testing different sections and features
- Clicking links and buttons to explore the site
- Checking for broken elements or errors
- Testing forms if present

What should we do next?`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshotBase64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    // Parse the response
    const responseText = message.content[0].text;

    // Try to extract JSON from the response
    let actionData;
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        actionData = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, create a default action
        actionData = {
          action: 'complete',
          reasoning: 'Could not parse action from response',
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse Claude response as JSON:', responseText);
      actionData = {
        action: 'complete',
        reasoning: 'Invalid response format',
      };
    }

    console.log('🤖 Claude decision:', actionData.action, '-', actionData.reasoning);

    return actionData;
  } catch (error) {
    console.error('❌ Failed to analyze and act:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Execute an action using Playwright
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {Object} action - Action object from analyzeAndAct
 * @returns {Promise<{success: boolean, message: string, error?: string}>}
 */
export async function executeAction(page, action) {
  try {
    const { action: actionType, target, value } = action;

    switch (actionType) {
      case 'click':
        if (!target) throw new Error('Click action requires a target selector');
        await page.click(target, { timeout: 5000 });
        return { success: true, message: `Clicked on ${target}` };

      case 'type':
        if (!target) throw new Error('Type action requires a target selector');
        if (!value) throw new Error('Type action requires a value');
        await page.fill(target, value);
        return { success: true, message: `Typed "${value}" into ${target}` };

      case 'scroll':
        const distance = target === 'up' ? -500 : 500;
        await page.evaluate((dist) => window.scrollBy(0, dist), distance);
        return { success: true, message: `Scrolled ${target}` };

      case 'navigate':
        if (!target) throw new Error('Navigate action requires a target URL');
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return { success: true, message: `Navigated to ${target}` };

      case 'wait':
        const duration = parseInt(value) || 1000;
        await page.waitForTimeout(duration);
        return { success: true, message: `Waited for ${duration}ms` };

      case 'complete':
        return { success: true, message: 'Testing complete' };

      default:
        return { success: false, message: `Unknown action: ${actionType}` };
    }
  } catch (error) {
    console.error('❌ Failed to execute action:', error);
    return {
      success: false,
      message: `Failed to execute ${action.action}`,
      error: error.message,
    };
  }
}

/**
 * Main testing loop - navigates and tests a website
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {string} url - Website URL to test
 * @param {Function} progressCallback - Callback function for progress updates
 * @returns {Promise<Array>} - Array of action logs
 */
export async function testWebsite(page, url, progressCallback = () => {}) {
  const actionLog = [];
  const maxActions = 15; // Limit to prevent infinite loops
  let actionCount = 0;

  try {
    // Set viewport size if not already set
    if (!page.viewportSize()) {
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    // Navigate to the initial URL
    progressCallback({ status: 'navigating', message: `Navigating to ${url}` });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    progressCallback({ status: 'testing', message: 'Starting AI-powered testing' });

    while (actionCount < maxActions) {
      actionCount++;

      // Wait a bit for page to stabilize
      await page.waitForTimeout(1000);

      // Get current page context
      const context = {
        url: page.url(),
        title: await page.title(),
        viewport: page.viewportSize(),
        previousActions: actionLog.map(log => log.action.action),
      };

      // Take screenshot
      progressCallback({ status: 'analyzing', message: 'Taking screenshot and analyzing...' });
      const screenshot = await page.screenshot({ type: 'png', fullPage: false });

      // Get AI decision
      const action = await analyzeAndAct(screenshot, context);

      // Check if testing is complete
      if (action.action === 'complete') {
        progressCallback({ status: 'complete', message: 'Testing completed' });
        actionLog.push({
          timestamp: new Date().toISOString(),
          action,
          result: { success: true, message: 'Testing completed by AI' },
          context,
        });
        break;
      }

      // Execute the action
      progressCallback({ status: 'acting', message: `Executing: ${action.action}` });
      const result = await executeAction(page, action);

      // Log the action
      actionLog.push({
        timestamp: new Date().toISOString(),
        action,
        result,
        context,
      });

      progressCallback({
        status: 'progress',
        message: `Action ${actionCount}/${maxActions}: ${action.action}`,
        result,
      });

      // If action failed, try to continue anyway
      if (!result.success) {
        console.warn(`⚠️  Action failed but continuing: ${result.message}`);
      }

      // Small delay between actions
      await page.waitForTimeout(500);
    }

    if (actionCount >= maxActions) {
      progressCallback({ status: 'complete', message: 'Reached maximum actions limit' });
    }

    return actionLog;
  } catch (error) {
    console.error('❌ Testing failed:', error);
    progressCallback({ status: 'error', message: `Testing failed: ${error.message}` });

    actionLog.push({
      timestamp: new Date().toISOString(),
      action: { action: 'error', reasoning: 'Testing failed' },
      result: { success: false, message: error.message },
      context: { url: page.url() },
    });

    return actionLog;
  }
}
