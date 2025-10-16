import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate a comprehensive website summary using Claude's vision API
 * @param {Array<{data: Buffer, position: string, timestamp: string}>} screenshots - Array of screenshot objects
 * @param {Object} metadata - Test metadata
 * @returns {Promise<Object>} - Summary object with structure and insights
 */
export async function generateWebsiteSummary(screenshots, metadata) {
  try {
    const { url, title, viewport } = metadata;

    // Prepare screenshot data for Claude
    const imageContent = screenshots.map((screenshot) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: screenshot.data.toString('base64'),
      },
    }));

    const systemPrompt = `You are an expert web design and UX analyst. Analyze the provided screenshots of a website and generate a comprehensive summary.

Your analysis should cover:
1. **Overall Design**: Visual style, color scheme, layout approach, responsiveness indicators
2. **Content Structure**: Main sections, navigation, content organization, information hierarchy
3. **User Experience**: Ease of use, accessibility considerations, interactive elements, user flow
4. **Key Features**: Notable functionality, unique features, calls-to-action
5. **Visual Quality**: Design consistency, typography, imagery, whitespace usage
6. **Potential Issues**: Any visual bugs, design inconsistencies, or UX concerns

Provide a structured, detailed analysis that would be useful for developers, designers, and stakeholders.`;

    const userPrompt = `Please analyze these screenshots from a website test session:

**Website URL**: ${url}
**Page Title**: ${title || 'Unknown'}
**Viewport**: ${viewport ? `${viewport.width}x${viewport.height}` : '1280x720'}
**Screenshots**: ${screenshots.length} images captured during scrolling (top to bottom)

Provide a comprehensive summary of the website's appearance, design, and user experience.`;

    // Create message with all screenshots
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    });

    const summaryText = message.content[0].text;

    console.log('✅ Generated AI summary:', summaryText.substring(0, 200) + '...');

    return {
      summary: summaryText,
      screenshotCount: screenshots.length,
      generatedAt: new Date().toISOString(),
      model: 'claude-3-5-sonnet-20241022',
    };
  } catch (error) {
    console.error('❌ Failed to generate website summary:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

/**
 * Generate a quick summary from a single screenshot
 * @param {Buffer} screenshot - Screenshot buffer
 * @param {Object} metadata - Page metadata
 * @returns {Promise<string>} - Quick summary text
 */
export async function generateQuickSummary(screenshot, metadata) {
  try {
    const { url, title } = metadata;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshot.toString('base64'),
              },
            },
            {
              type: 'text',
              text: `Provide a brief 2-3 sentence summary of this website (${url}). Focus on its purpose, main content, and visual design.`,
            },
          ],
        },
      ],
    });

    return message.content[0].text;
  } catch (error) {
    console.error('❌ Failed to generate quick summary:', error);
    return 'Summary generation failed';
  }
}
