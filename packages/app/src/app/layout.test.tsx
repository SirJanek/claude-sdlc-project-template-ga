import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RootLayout, { metadata } from './layout';

describe('root layout', () => {
  it('sets the language, metadata and renders children', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>child</p>
      </RootLayout>,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<p>child</p>');
    expect(metadata.title).toBe('MentorHub');
  });
});
