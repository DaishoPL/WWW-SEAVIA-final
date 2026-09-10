<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

function respond(int $status, string $message)
{
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function getClientIp(): string
{
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if (is_string($forwarded) && $forwarded !== '') {
        $candidate = explode(',', $forwarded)[0];
        $candidate = trim($candidate);
        if ($candidate !== '') {
            return $candidate;
        }
    }

    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

function enforceRateLimit(string $ip): void
{
    $limitWindow = 600;
    $maxRequests = 5;
    $cacheDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'seavia_recruitment';

    if (!is_dir($cacheDir) && !@mkdir($cacheDir, 0770, true) && !is_dir($cacheDir)) {
        return;
    }

    $safeIp = preg_replace('/[^A-Za-z0-9._:-]/', '_', $ip) ?: 'unknown';
    $cacheFile = $cacheDir . DIRECTORY_SEPARATOR . $safeIp . '.json';
    $now = time();
    $entries = [];

    if (is_file($cacheFile)) {
        $raw = @file_get_contents($cacheFile);
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded) && isset($decoded['requests']) && is_array($decoded['requests'])) {
                $entries = $decoded['requests'];
            }
        }
    }

    $entries = array_values(array_filter(array_map('intval', $entries), static fn (int $timestamp): bool => $timestamp > $now - $limitWindow));

    if (count($entries) >= $maxRequests) {
        respond(429, 'Too many requests. Please try again later.');
    }

    $entries[] = $now;
    @file_put_contents($cacheFile, json_encode(['requests' => $entries], JSON_UNESCAPED_UNICODE));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, 'Invalid request method.');
}

$honeypot = trim((string) ($_POST['website'] ?? ''));
if ($honeypot !== '') {
    respond(400, 'Invalid request.');
}

$captchaFirst = filter_var($_POST['captchaFirst'] ?? null, FILTER_VALIDATE_INT);
$captchaSecond = filter_var($_POST['captchaSecond'] ?? null, FILTER_VALIDATE_INT);
$captchaAnswer = filter_var($_POST['captchaAnswer'] ?? null, FILTER_VALIDATE_INT);
if ($captchaFirst === false || $captchaSecond === false || $captchaAnswer === false
    || $captchaFirst < 2 || $captchaFirst > 9
    || $captchaSecond < 2 || $captchaSecond > 9
    || $captchaAnswer !== $captchaFirst + $captchaSecond) {
    respond(422, 'Please solve the security check correctly.');
}

enforceRateLimit(getClientIp());

$firstName = trim((string) ($_POST['firstName'] ?? ''));
$lastName = trim((string) ($_POST['lastName'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$about = trim((string) ($_POST['about'] ?? ''));

if ($firstName === '' || $lastName === '' || $phone === '' || $about === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, 'Please complete all required fields with valid information.');
}

$cvUploadError = (int) ($_FILES['cvFile']['error'] ?? UPLOAD_ERR_NO_FILE);
if ($cvUploadError !== UPLOAD_ERR_NO_FILE && $cvUploadError !== UPLOAD_ERR_OK) {
    respond(422, 'The CV could not be uploaded. Please try again.');
}

$cvAvailable = $cvUploadError === UPLOAD_ERR_OK;

$recipient = 'tylotyznaszadres@gmail.com';
$subject = 'Nowa aplikacja rekrutacyjna - SEAVIA';
$senderName = preg_replace('/[\r\n]+/', ' ', "$firstName $lastName");
$body = "First name: {$firstName}\nLast name: {$lastName}\nPhone: {$phone}\nEmail: {$email}\n\nAbout the applicant:\n{$about}\n";

$headers = "From: SEAVIA website <no-reply@seaviamarine.com>\r\n";
$headers .= "Reply-To: {$email}\r\n";

if ($cvAvailable) {
    $cv = $_FILES['cvFile'];
    if ($cv['size'] > 5 * 1024 * 1024) {
        respond(422, 'The CV file must be smaller than 5 MB.');
    }

    $extension = strtolower(pathinfo((string) $cv['name'], PATHINFO_EXTENSION));
    $allowedExtensions = ['pdf', 'doc', 'docx'];
    if (!in_array($extension, $allowedExtensions, true)) {
        respond(422, 'The CV must be a PDF, DOC, or DOCX file.');
    }

    $uploadPath = (string) $cv['tmp_name'];
    $detectedMime = (new finfo(FILEINFO_MIME_TYPE))->file($uploadPath);
    $allowedMimes = [
        'pdf' => ['application/pdf'],
        'doc' => ['application/msword', 'application/octet-stream'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    ];
    if (!in_array($detectedMime, $allowedMimes[$extension], true)) {
        respond(422, 'The uploaded CV file type is not valid.');
    }

    $boundary = bin2hex(random_bytes(16));
    $filename = preg_replace('/[^A-Za-z0-9._-]/', '_', basename((string) $cv['name']));
    $encodedFile = chunk_split(base64_encode((string) file_get_contents($uploadPath)));
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
    $message = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n{$body}\r\n";
    $message .= "--{$boundary}\r\nContent-Type: {$detectedMime}; name=\"{$filename}\"\r\nContent-Disposition: attachment; filename=\"{$filename}\"\r\nContent-Transfer-Encoding: base64\r\n\r\n{$encodedFile}\r\n--{$boundary}--\r\n";
} else {
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $message = $body;
}

if (!mail($recipient, $subject, $message, $headers)) {
    respond(500, 'The application could not be sent. Please try again later.');
}

$confirmationSubject = 'Potwierdzenie otrzymania zgłoszenia - SEAVIA';
$confirmationBody = "Dzień dobry {$firstName},\n\nPotwierdzamy otrzymanie zgłoszenia rekrutacyjnego w SEAVIA.\nSkontaktujemy się z Tobą, jeśli będziemy potrzebować dodatkowych informacji.\n\nPozdrawiamy,\nSEAVIA\n";
$confirmationHeaders = "From: SEAVIA <no-reply@seaviamarine.com>\r\n";
$confirmationHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
mail($email, $confirmationSubject, $confirmationBody, $confirmationHeaders);

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Your application has been sent.'], JSON_UNESCAPED_UNICODE);
