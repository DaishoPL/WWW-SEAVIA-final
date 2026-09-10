# Worker formularza SEAVIA

Ten Worker zastępuje endpoint PHP z funkcją `mail()` i wysyła zgłoszenia rekrutacyjne przez Resend.

## Wdrożenie

1. Załóż konto w Resend i zweryfikuj domenę `seaviamarine.com` jako domenę nadawcy.
2. W tym katalogu zainstaluj Wrangler, jeśli nie jest jeszcze dostępny, i zaloguj się:

   ```sh
   npm install --save-dev wrangler
   npx wrangler login
   ```

3. Skonfiguruj sekrety:

   ```sh
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put RECIPIENT_EMAIL
   ```

   `RECIPIENT_EMAIL` może pozostać obecnym adresem testowym.

4. Wdróż Workera:

   ```sh
   npx wrangler deploy
   ```

5. W panelu Cloudflare przypnij custom domain `api.seaviamarine.com` do Workera. Dla custom domain nie dodawaj ścieżki `/recruitment` w konfiguracji DNS ani trasy. Formularz wysyła dane pod adres:

   ```text
   https://api.seaviamarine.com/recruitment
   ```

Worker akceptuje wyłącznie żądania pochodzące z dwóch adresów strony SEAVIA, sprawdza CAPTCHA i pole honeypot, stosuje podstawowy limit liczby żądań oraz obsługuje załączniki PDF/DOC/DOCX o rozmiarze do 5 MB.