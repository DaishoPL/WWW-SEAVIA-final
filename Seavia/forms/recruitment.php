<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

function respond(int $status, string $message)
{
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, 'Invalid request method.');
}

$turnstileSecret = getenv('TURNSTILE_SECRET_KEY') ?: ($_SERVER['TURNSTILE_SECRET_KEY'] ?? '');
$turnstileToken = trim((string) ($_POST['cf-turnstile-response'] ?? ''));

if ($turnstileSecret === '' || $turnstileToken === '') {
    respond(400, 'Please complete the security check.');
}

$verificationContext = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => http_build_query([
            'secret' => $turnstileSecret,
            'response' => $turnstileToken,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ]),
        'timeout' => 10,
        'ignore_errors' => true,
    ],
]);
$verification = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $verificationContext);
$verificationResult = is_string($verification) ? json_decode($verification, true) : null;

if (!is_array($verificationResult) || empty($verificationResult['success'])) {
    respond(403, 'The security check could not be verified.');
}

$firstName = trim((string) ($_POST['firstName'] ?? ''));
$lastName = trim((string) ($_POST['lastName'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$about = trim((string) ($_POST['about'] ?? ''));

if ($firstName === '' || $lastName === '' || $phone === '' || $about === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, 'Please complete all required fields with valid information.');
}

if (!isset($_FILES['cvFile']) || $_FILES['cvFile']['error'] !== UPLOAD_ERR_OK) {
    respond(422, 'Please attach your CV.');
}

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

$recipient = 'rekrutacja@seaviamarine.com';
$subject = 'Nowa aplikacja rekrutacyjna - SEAVIA';
$boundary = bin2hex(random_bytes(16));
$senderName = preg_replace('/[\r\n]+/', ' ', "$firstName $lastName");
$filename = preg_replace('/[^A-Za-z0-9._-]/', '_', basename((string) $cv['name']));
$body = "First name: {$firstName}\nLast name: {$lastName}\nPhone: {$phone}\nEmail: {$email}\n\nAbout the applicant:\n{$about}\n";
$encodedFile = chunk_split(base64_encode((string) file_get_contents($uploadPath)));

$headers = "From: SEAVIA website <no-reply@seaviamarine.com>\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
$message = "--{$boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n{$body}\r\n";
$message .= "--{$boundary}\r\nContent-Type: {$detectedMime}; name=\"{$filename}\"\r\nContent-Disposition: attachment; filename=\"{$filename}\"\r\nContent-Transfer-Encoding: base64\r\n\r\n{$encodedFile}\r\n--{$boundary}--\r\n";

if (!mail($recipient, $subject, $message, $headers)) {
    respond(500, 'The application could not be sent. Please try again later.');
}

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Your application has been sent.'], JSON_UNESCAPED_UNICODE);
