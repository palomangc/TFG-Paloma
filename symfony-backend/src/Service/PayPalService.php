<?php
namespace App\Service;

class PayPalService
{
    private string $clientId;
    private string $secret;
    private string $env;
    private string $apiBase;

    public function __construct(string $clientId, string $secret, string $env = 'sandbox')
    {
        $this->clientId = $clientId;
        $this->secret = $secret;
        $this->env = $env;
        $this->apiBase = $env === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    /**
     * Crea una orden PayPal y devuelve la URL de aprobación (approve_url).
     *
     * @param int $reservationId
     * @param float $amount
     * @param string $returnUrl
     * @param string $cancelUrl
     * @return string approve_url
     *
     * @throws \RuntimeException en caso de error
     */
    public function createOrder(int $reservationId, float $amount, string $returnUrl, string $cancelUrl): string
    {
        // 1) Obtener access token
        $accessToken = $this->getAccessToken();

        // 2) Construir payload de la orden (ajústalo a tus necesidades)
        $payload = [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => (string)$reservationId,
                'amount' => [
                    'currency_code' => 'EUR',
                    'value' => number_format($amount, 2, '.', '')
                ],
                'description' => sprintf('Depósito reserva #%d', $reservationId)
            ]],
            'application_context' => [
                'return_url' => $returnUrl,
                'cancel_url' => $cancelUrl,
                'brand_name' => 'Eterna Aurea',
                'landing_page' => 'NO_PREFERENCE',
                'user_action' => 'PAY_NOW'
            ]
        ];

        $url = $this->apiBase . '/v2/checkout/orders';

        $response = $this->httpRequest('POST', $url, $accessToken, $payload);

        // Comprobar respuesta
        if (!isset($response['id']) || !isset($response['links']) || !is_array($response['links'])) {
            throw new \RuntimeException('Respuesta inesperada de PayPal al crear orden.');
        }

        // Buscar link de aprobación
        foreach ($response['links'] as $link) {
            if (isset($link['rel']) && $link['rel'] === 'approve' && !empty($link['href'])) {
                return $link['href'];
            }
        }

        // En caso de no encontrar approve link, lanzar excepción con info de respuesta para debugging
        throw new \RuntimeException('No se encontró la URL de aprobación en la respuesta de PayPal: ' . json_encode($response));
    }

    /**
     * Captura una orden PayPal (viene tras la redirección del usuario).
     *
     * @param string $orderId
     * @return array respuesta decodificada de PayPal
     *
     * @throws \RuntimeException en caso de error
     */
    public function captureOrder(string $orderId): array
    {
        $accessToken = $this->getAccessToken();

        $url = $this->apiBase . '/v2/checkout/orders/' . urlencode($orderId) . '/capture';

        $response = $this->httpRequest('POST', $url, $accessToken);

        if (!is_array($response)) {
            throw new \RuntimeException('Respuesta inesperada de PayPal al capturar orden.');
        }

        return $response;
    }

    /**
     * Obtiene un access token de PayPal.
     *
     * @return string access token
     * @throws \RuntimeException
     */
    private function getAccessToken(): string
    {
        $url = $this->apiBase . '/v1/oauth2/token';
        $basicAuth = base64_encode(sprintf('%s:%s', $this->clientId, $this->secret));

        $headers = [
            "Authorization: Basic {$basicAuth}",
            "Content-Type: application/x-www-form-urlencoded"
        ];

        $body = 'grant_type=client_credentials';

        $raw = $this->rawHttpRequest($url, 'POST', $headers, $body);

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || empty($decoded['access_token'])) {
            throw new \RuntimeException('No se pudo obtener access token de PayPal: ' . $raw);
        }

        return $decoded['access_token'];
    }

    /**
     * Petición HTTP para endpoints JSON authenticated (usa access token si se proporciona).
     *
     * @param string $method GET|POST
     * @param string $url
     * @param string|null $accessToken
     * @param array|null $payload
     * @return array decoded JSON response
     *
     * @throws \RuntimeException
     */
    private function httpRequest(string $method, string $url, ?string $accessToken = null, ?array $payload = null): array
    {
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        if ($accessToken) {
            $headers[] = 'Authorization: Bearer ' . $accessToken;
        }

        $body = null;
        if ($payload !== null) {
            $body = json_encode($payload);
            if ($body === false) {
                throw new \RuntimeException('Error al codificar JSON del payload.');
            }
        }

        $raw = $this->rawHttpRequest($url, $method, $headers, $body);

        $decoded = json_decode($raw, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Respuesta JSON inválida de PayPal: ' . $raw);
        }

        return $decoded;
    }

    /**
     * Realiza petición HTTP simple con cURL y devuelve el body crudo.
     *
     * @param string $url
     * @param string $method
     * @param string[] $headers
     * @param string|null $body
     * @return string raw response
     *
     * @throws \RuntimeException
     */
    private function rawHttpRequest(string $url, string $method = 'GET', array $headers = [], ?string $body = null): string
    {
        $ch = curl_init();

        $opts = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_FOLLOWLOCATION => true,
        ];

        if ($method === 'POST') {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = $body ?? '';
        } else {
            $opts[CURLOPT_CUSTOMREQUEST] = $method;
        }

        // set headers
        $opts[CURLOPT_HTTPHEADER] = $headers;

        curl_setopt_array($ch, $opts);

        $response = curl_exec($ch);
        $errNo = curl_errno($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        curl_close($ch);

        if ($errNo) {
            throw new \RuntimeException("Error cURL ({$errNo}): {$err}");
        }

        if ($httpCode >= 400) {
            // include http body for debugging
            throw new \RuntimeException("PayPal API responded with HTTP {$httpCode}: {$response}");
        }

        return (string)$response;
    }
}
