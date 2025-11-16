<?php

declare(strict_types=1);

namespace App\Service;

final class RatesService
{
    /**
     * @param array<string> $currencies     Lista walut                   
     * @param array<string,string> $names   Mapowanie po polskich nazwach
     * @param array<string,array{members:array<string>,buy_delta:float|null,sell_delta:float|null}> $spreads    Reguły dla grup walut
     */

    public function __construct(
        private NbpClient $nbp,
        private array $currencies = [],
        private array $names = [],
        private array $spreads = [],
    ) {
        foreach ($this->currencies as $c) {
            $covered = false;
            foreach ($this->spreads as $g) {
                if (in_array($c, $g['members'] ?? [], true)) {
                    $covered = true;
                    break;
                }
            }
            if (!$covered) {
                throw new \LogicException(sprintf('Waluta %s nie ma przypisanej reguły spreadu w konfiguracji.', $c));
            }
        }
    }


    public function getDailyRates(string $date): array
    {
        $baseDate = $this->toDate($date);
        $table = $this->nbp->getTableAForDate($baseDate);

        $wanted = [];
        foreach ($table['rates'] as $r) {
            $code = $r['code'] ?? null;
            if (!$code || !in_array($code, $this->currencies, true)) {
                continue;
            }

            $mid = (float) $r['mid'];
            $calc = $this->computeBuySell($code, $mid);

            $wanted[] = [
                'code' => $code,
                'name' => $this->plName($code),
                'mid'  => $this->round4($mid),
                'buy'  => $calc['buy'],
                'sell' => $calc['sell'],
            ];
        }

        $order = array_flip($this->currencies);
        usort($wanted, fn($a, $b) => ($order[$a['code']] ?? PHP_INT_MAX) <=> ($order[$b['code']] ?? PHP_INT_MAX));


        return [
            'baseDate' => $table['effectiveDate'],
            'rates'    => $wanted,
        ];
    }

    public function getHistory(string $code, string $date, int $days): array
    {
        $days = max(1, min($days, 30));
        $code = strtoupper($code);

        if (!in_array($code, $this->currencies, true)) {
            throw new \InvalidArgumentException('Nieobsługiwana waluta');
        }

        $end = $this->toDate($date);
        $tableAtEnd = $this->nbp->getTableAForDate($end);
        $effectiveEnd = \DateTimeImmutable::createFromFormat('Y-m-d', $tableAtEnd['effectiveDate']);
        if (!$effectiveEnd) {
            throw new \RuntimeException('Błędna data');
        }

        $points = [];
        $curr = $effectiveEnd->modify('-1 day');
        while (count($points) < $days) {
            $t = $this->nbp->getTableAForDate($curr);
            $rate = $this->findRate($t['rates'], $code);
            if ($rate) {
                $mid  = (float) $rate['mid'];
                $calc = $this->computeBuySell($code, $mid);

                $points[] = [
                    'date' => $t['effectiveDate'],
                    'mid'  => $this->round4($mid),
                    'buy'  => $calc['buy'],
                    'sell' => $calc['sell'],
                ];
                $curr = \DateTimeImmutable::createFromFormat('Y-m-d', $t['effectiveDate'])->modify('-1 day');
            } else {
                $curr = $curr->modify('-1 day');
            }
        }

        usort($points, fn($a, $b) => strcmp($a['date'], $b['date']));

        return [
            'code'     => $code,
            'name'     => $this->plName($code),
            'baseDate' => $tableAtEnd['effectiveDate'],
            'days'     => $days,
            'history'  => $points,
        ];
    }

    private function findRate(array $rates, string $code): ?array
    {
        foreach ($rates as $r) {
            if (($r['code'] ?? null) === $code) {
                return $r;
            }
        }
        return null;
    }

    private function computeBuySell(string $code, float $mid): array
    {
        foreach ($this->spreads as $groupName => $group) {
            if (in_array($code, $group['members'] ?? [], true)) {
                $buy  = array_key_exists('buy_delta', $group) && $group['buy_delta'] !== null
                    ? $this->round4($mid + (float) $group['buy_delta'])
                    : null;

                $sell = array_key_exists('sell_delta', $group) && $group['sell_delta'] !== null
                    ? $this->round4($mid + (float) $group['sell_delta'])
                    : null;

                return ['buy' => $buy, 'sell' => $sell];
            }
        }

        if (isset($this->spreads['other'])) {
            $g = $this->spreads['other'];
            $buy  = ($g['buy_delta'] ?? null) !== null ? $this->round4($mid + (float) $g['buy_delta']) : null;
            $sell = ($g['sell_delta'] ?? null) !== null ? $this->round4($mid + (float) $g['sell_delta']) : null;
            return ['buy' => $buy, 'sell' => $sell];
        }

        throw new \RuntimeException(sprintf('Brak reguł spreadu dla waluty %s', $code));
    }

    private function plName(string $code): string
    {
        return $this->names[$code] ?? $code;
    }

    private function toDate(string $yyyyMmDd): \DateTimeImmutable
    {
        return \DateTimeImmutable::createFromFormat('Y-m-d', $yyyyMmDd)
            ?: new \DateTimeImmutable('today');
    }

    private function round4(float $v): float
    {
        return round($v, 4);
    }
}
