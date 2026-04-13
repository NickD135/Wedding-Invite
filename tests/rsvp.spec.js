import { test, expect } from '@playwright/test';

test.describe('Wedding Website', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /* ── Hero ── */

  test('hero loads with correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Nicholas.*Jodee/);
  });

  test('hero displays names and date', async ({ page }) => {
    const names = page.locator('.hero-names');
    await expect(names).toContainText('Nicholas');
    await expect(names).toContainText('Jodee');
    await expect(page.locator('.hero-date')).toContainText('11 July 2026');
  });

  test('countdown timer displays numbers', async ({ page }) => {
    // Wait for JS to populate
    await page.waitForFunction(
      () => document.getElementById('cd-days').textContent !== '---'
    );
    const days = await page.locator('#cd-days').textContent();
    expect(Number(days)).toBeGreaterThanOrEqual(0);
  });

  /* ── Navigation ── */

  test('nav links scroll to correct sections', async ({ page }) => {
    const sections = ['story', 'details', 'rsvp', 'travel', 'faqs', 'gifts'];
    for (const id of sections) {
      const section = page.locator(`#${id}`);
      await expect(section).toBeAttached();
    }
  });

  test('nav becomes opaque on scroll', async ({ page }) => {
    const nav = page.locator('#main-nav');
    await expect(nav).not.toHaveClass(/scrolled/);
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect(nav).toHaveClass(/scrolled/);
  });

  test('clicking nav link scrolls to section', async ({ page }) => {
    await page.locator('a[href="#rsvp"]').click();
    await page.waitForTimeout(600);
    const rsvpSection = page.locator('#rsvp');
    await expect(rsvpSection).toBeInViewport();
  });

  /* ── Mobile hamburger ── */

  test('mobile hamburger menu toggles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const toggle = page.locator('#nav-toggle');
    const links = page.locator('#nav-links');

    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(links).toHaveClass(/open/);
    await toggle.click();
    await expect(links).not.toHaveClass(/open/);
  });

  /* ── Our Story ── */

  test('Our Story section has timeline content', async ({ page }) => {
    await expect(page.locator('#story .timeline-item')).toHaveCount(2);
    await expect(page.locator('#story .photo-gallery')).toBeAttached();
  });

  /* ── Details ── */

  test('Details section shows ceremony info', async ({ page }) => {
    const details = page.locator('#details');
    await expect(details).toContainText('6:15 pm');
    await expect(details).toContainText('Ceremony');
    await expect(details).toContainText('Cocktail Attire');
  });

  test('invitation modal opens and closes', async ({ page }) => {
    // Scroll to button
    await page.locator('#invite-btn').scrollIntoViewIfNeeded();
    await page.locator('#invite-btn').click();

    const modal = page.locator('#invite-modal');
    await expect(modal).toHaveClass(/active/);

    await page.locator('#modal-close').click();
    await expect(modal).not.toHaveClass(/active/);
  });

  /* ── RSVP ── */

  test('RSVP form validates required fields', async ({ page }) => {
    await page.locator('#rsvp').scrollIntoViewIfNeeded();
    await page.locator('#submit-btn').click();

    await expect(page.locator('#err-name')).toBeVisible();
    await expect(page.locator('#err-email')).toBeVisible();
    await expect(page.locator('#err-attend')).toBeVisible();
  });

  test('RSVP accept reveals dietary and song fields', async ({ page }) => {
    await page.locator('#rsvp').scrollIntoViewIfNeeded();
    await page.locator('#btn-yes').click();

    await expect(page.locator('#btn-yes')).toHaveClass(/sel-yes/);
    await expect(page.locator('#field-dietary')).toBeVisible();
    await expect(page.locator('#field-song')).toBeVisible();
  });

  test('RSVP decline hides dietary and song fields', async ({ page }) => {
    await page.locator('#rsvp').scrollIntoViewIfNeeded();
    // First accept to show fields
    await page.locator('#btn-yes').click();
    await expect(page.locator('#field-dietary')).toBeVisible();

    // Then decline
    await page.locator('#btn-no').click();
    await expect(page.locator('#btn-no')).toHaveClass(/sel-no/);
    await expect(page.locator('#field-dietary')).toBeHidden();
    await expect(page.locator('#field-song')).toBeHidden();
  });

  test('RSVP form submits successfully', async ({ page }) => {
    await page.locator('#rsvp').scrollIntoViewIfNeeded();

    await page.locator('#rsvp-name').fill('Test Guest');
    await page.locator('#rsvp-email').fill('test@example.com');
    await page.locator('#btn-yes').click();
    await page.locator('#rsvp-dietary').fill('No nuts');
    await page.locator('#rsvp-song').fill('Dancing Queen');
    await page.locator('#submit-btn').click();

    await expect(page.locator('#success-screen')).toHaveClass(/visible/);
    await expect(page.locator('#success-screen')).toContainText('Thank You');
  });

  test('RSVP shows deadline text', async ({ page }) => {
    await expect(page.locator('.rsvp-deadline')).toContainText('15 May 2026');
  });

  /* ── Travel & Stay ── */

  test('Travel section has transport and accommodation info', async ({ page }) => {
    const travel = page.locator('#travel');
    await expect(travel).toContainText('QT Hotel');
    await expect(travel).toContainText('Wilson Parking');
    await expect(travel).toContainText('Uber');
  });

  /* ── FAQs ── */

  test('FAQ accordions open and close', async ({ page }) => {
    await page.locator('#faqs').scrollIntoViewIfNeeded();
    // Wait for reveal animation
    await page.waitForTimeout(300);

    const firstQuestion = page.locator('.faq-question').first();
    await firstQuestion.click();

    const firstItem = page.locator('.faq-item').first();
    await expect(firstItem).toHaveClass(/open/);

    // Click again to close
    await firstQuestion.click();
    await expect(firstItem).not.toHaveClass(/open/);
  });

  test('FAQ has all 5 questions', async ({ page }) => {
    await expect(page.locator('.faq-item')).toHaveCount(5);
  });

  /* ── Gifts ── */

  test('Gifts section has wishing well text', async ({ page }) => {
    await expect(page.locator('#gifts')).toContainText('wishing well');
  });

  /* ── Footer ── */

  test('footer shows names and date', async ({ page }) => {
    const footer = page.locator('.site-footer');
    await expect(footer).toContainText('Nicholas');
    await expect(footer).toContainText('Jodee');
    await expect(footer).toContainText('11 July 2026');
  });

  /* ── Responsive ── */

  test('site renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('.hero-names')).toBeVisible();
    await expect(page.locator('.rsvp-card')).toBeAttached();
    await expect(page.locator('#nav-toggle')).toBeVisible();
  });

  test('site renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.hero-names')).toBeVisible();
    await expect(page.locator('.program-card')).toBeAttached();
  });
});
