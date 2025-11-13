<?php

declare(strict_types=1);

namespace App\Service;

final class NbpClient
{
    private const TABLE_A_URL = 'https://api.nbp.pl/api/exchangerates/tables/A/%s?format=json';
    private string $cacheDir;

    public function __construct(string $cacheDir)
    {
        $this->cacheDir = rtrim($cacheDir, '/') . '/nbp';

        if (!is_dir($this->cacheDir)) {
            if (!mkdir($this->cacheDir, 0777, true) && !is_dir($this->cacheDir)) {
                throw new \RuntimeException(sprintf('Nie można utworzyć katalogu cache: %s', $this->cacheDir));
            }
        }
    }

    public function getTableAForDate(\DateTimeImmutable $date): array
    {
        $today = new \DateTimeImmutable('today');
        $curr = $date > $today ? $today : $date;
        $maxAttempts = 14;

        for ($i = 0; $i < $maxAttempts; $i++) {
            $data = $this->fetchTableA($curr);
            if ($data !== null) {
                return $data; 
            }
            $curr = $curr->modify('-1 day');
        }

        throw new \RuntimeException('NBP: brak danych w ostatnich dniach.');
    }

    private function fetchTableA(\DateTimeImmutable $date): ?array
    {
        $yyyyMmDd = $date->format('Y-m-d');
        $cacheKey = $this->cacheDir . "/tableA_{$yyyyMmDd}.json";

        if (is_file($cacheKey)) {
            $decoded = json_decode((string)file_get_contents($cacheKey), true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $url = sprintf(self::TABLE_A_URL, $yyyyMmDd);
        $context = stream_context_create(['http' => ['timeout' => 5]]);
        $json = @file_get_contents($url, false, $context);

        if ($json === false) {
            return null;
        }

        $arr = json_decode($json, true);
        if (!is_array($arr) || empty($arr[0]['rates']) || empty($arr[0]['effectiveDate'])) {
            return null;
        }

        $normalized = [
            'effectiveDate' => $arr[0]['effectiveDate'],
            'rates' => array_map(
                static fn($r) => [
                    'code' => $r['code'],
                    'mid' => (float)$r['mid'],
                    'currency' => $r['currency'],
                ],
                $arr[0]['rates']
            ),
        ];

        if (file_put_contents($cacheKey, json_encode($normalized, JSON_THROW_ON_ERROR)) === false) {
            throw new \RuntimeException(sprintf('Nie udało się zapisać pliku cache: %s', $cacheKey));
        }

        return $normalized;
    }
}
