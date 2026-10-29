import { test, expect } from '@playwright/test';

test.describe('KaamSetu End-to-End User Booking Flow', () => {
  test('Customer signs in with phone OTP, books a worker, and tracks arrival in My Bookings', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/en');
    await expect(page).toHaveTitle(/KaamSetu/);

    // 2. Open Sign In modal
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('#auth-modal-title')).toBeVisible();

    // 3. Enter Indian mobile number & request OTP
    await page.fill('input[type="tel"]', '9876543210');
    await page.click('button[type="submit"]:has-text("Send 6-digit Code")');

    // 4. In dev/test mode, verify with bypass OTP "000000"
    await page.fill('input[placeholder="000000"]', '000000');
    await page.click('button:has-text("Verify & Continue")');

    // 5. User should be authenticated
    await expect(page.locator('a[href*="/account"]')).toBeVisible();

    // 6. Find a plumber worker card and click Book
    const firstWorkerCard = page.locator('article.card, article').first();
    await firstWorkerCard.locator('button:has-text("Book")').click();

    // 7. Booking dialog should be open
    await expect(page.locator('#booking-dialog-title')).toBeVisible();

    // Fill job description
    await page.fill('textarea', 'Fix kitchen washbasin pipe leakage');
    await page.click('button[type="submit"]:has-text("Send booking request")');

    // 8. Confetti and success message with tracking trigger
    await expect(page.locator('text=Booking Request Sent!')).toBeVisible();

    // 9. Open Live Track
    await page.click('button:has-text("Track worker")');

    // Verify 3D / GPS tracking scene opens
    await expect(page.locator('text=Estimated Arrival')).toBeVisible();

    // 10. Navigate to My Account to see persistent booking
    await page.goto('/en/account');
    await expect(page.locator('text=Kitchen washbasin pipe leakage')).toBeVisible();
  });
});
