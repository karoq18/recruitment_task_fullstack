<?php
declare(strict_types=1);

namespace App\Controller;

use App\Service\RatesService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

final class RatesController
{
    public function __construct(private RatesService $service) {}

    public function daily(Request $req): JsonResponse
    {
        try {
            $date = $req->query->get('date')
                ?? (new \DateTimeImmutable('today'))->format('Y-m-d');

            return new JsonResponse($this->service->getDailyRates($date));

        } catch (\Throwable $e) {
            return new JsonResponse(
                ['error' => $e->getMessage()],
                400
            );
        }
    }

    public function history(string $code, Request $req): JsonResponse
    {
        try {
            $code = strtoupper($code);

            if (!preg_match('/^[A-Z]{3}$/', $code)) {
                return new JsonResponse([
                    'error' => 'Nieprawidłowy kod waluty.'
                ], 400);
            }

            $date = $req->query->get('date')
                ?? (new \DateTimeImmutable('today'))->format('Y-m-d');

            $days = (int)($req->query->get('days') ?? 14);

            return new JsonResponse(
                $this->service->getHistory($code, $date, $days)
            );

        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 400);

        } catch (\Throwable $e) {
            return new JsonResponse(['error' => 'Błąd przetwarzania żądania.'], 400);
        }
    }
}
