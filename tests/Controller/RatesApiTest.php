<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class RatesApiTest extends WebTestCase
{
    private function findRate(array $rates, string $code): ?array
    {
        foreach ($rates as $rate) {
            if (($rate['code'] ?? null) === $code) {
                return $rate;
            }
        }
        return null;
    }

    public function test_spreads_are_applied_correctly_in_rates_endpoint(): void
    {
        $client = static::createClient();

        $client->request('GET', '/api/rates');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('rates', $data);
        $this->assertIsArray($data['rates']);

        $eur = $this->findRate($data['rates'], 'EUR');
        $usd = $this->findRate($data['rates'], 'USD');
        $czk = $this->findRate($data['rates'], 'CZK');
        $idr = $this->findRate($data['rates'], 'IDR');
        $brl = $this->findRate($data['rates'], 'BRL');

        $this->assertNotNull($eur, 'EUR powinno być obecne w liście kursów.');
        $this->assertNotNull($usd, 'USD powinno być obecne w liście kursów.');
        $this->assertNotNull($czk, 'CZK powinno być obecne w liście kursów.');
        $this->assertNotNull($idr, 'IDR powinno być obecne w liście kursów.');
        $this->assertNotNull($brl, 'BRL powinno być obecne w liście kursów.');

        $this->assertArrayHasKey('mid', $eur);
        $this->assertArrayHasKey('buy', $eur);
        $this->assertArrayHasKey('sell', $eur);

        $this->assertEqualsWithDelta(
            0.15,
            $eur['mid'] - $eur['buy'],
            0.0001,
            'Dla EUR różnica mid - buy powinna wynosić 0.15'
        );

        $this->assertEqualsWithDelta(
            0.11,
            $eur['sell'] - $eur['mid'],
            0.0001,
            'Dla EUR różnica sell - mid powinna wynosić 0.11'
        );

        $this->assertArrayHasKey('mid', $usd);
        $this->assertArrayHasKey('buy', $usd);
        $this->assertArrayHasKey('sell', $usd);

        $this->assertEqualsWithDelta(
            0.15,
            $usd['mid'] - $usd['buy'],
            0.0001,
            'Dla USD różnica mid - buy powinna wynosić 0.15'
        );

        $this->assertEqualsWithDelta(
            0.11,
            $usd['sell'] - $usd['mid'],
            0.0001,
            'Dla USD różnica sell - mid powinna wynosić 0.11'
        );

        foreach (['CZK' => $czk, 'IDR' => $idr, 'BRL' => $brl] as $code => $rate) {
            $this->assertArrayHasKey('mid', $rate, "Dla {$code} powinien być mid");
            $this->assertArrayHasKey('sell', $rate, "Dla {$code} powinien być sell");

            $this->assertTrue(
                !array_key_exists('buy', $rate) || $rate['buy'] === null,
                "Dla {$code} nie powinno być kursu kupna (buy === null lub brak pola)."
            );

            $this->assertEqualsWithDelta(
                0.2,
                $rate['sell'] - $rate['mid'],
                0.0001,
                "Dla {$code} różnica sell - mid powinna wynosić 0.2"
            );
        }
    }

    public function test_history_endpoint_returns_up_to_14_days_before_date(): void
    {
        $client = static::createClient();

        $date = '2024-01-15';

        $client->request('GET', sprintf('/api/rates/%s/history?date=%s&days=14', urlencode('EUR'), $date));

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('history', $data);
        $this->assertIsArray($data['history']);

        $history = $data['history'];

        $this->assertLessThanOrEqual(14, count($history), 'Endpoint history powinien zwracać maksymalnie 14 rekordów.');

        $baseDate = $data['baseDate'] ?? $date;

        foreach ($history as $row) {
            $this->assertArrayHasKey('date', $row);
            $this->assertArrayHasKey('mid', $row);
            $this->assertArrayHasKey('sell', $row);

            $this->assertIsString($row['date']);

            $this->assertLessThanOrEqual(
                $baseDate,
                $row['date'],
                'Każda data w historii powinna być nie późniejsza niż baseDate.'
            );
        }
    }

    public function test_calculator_buy_sell_consistency_with_backend(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/rates');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $rates = $data['rates'];

        $calcBuyAllowed = ['EUR', 'USD'];
        $calcSellOnly = ['CZK', 'IDR', 'BRL'];

        foreach ($rates as $rate) {
            $code = $rate['code'];
            $mid  = $rate['mid'];
            $buy  = $rate['buy'] ?? null;
            $sell = $rate['sell'];

            if (in_array($code, $calcBuyAllowed, true)) {
                $this->assertNotNull(
                    $buy,
                    "Kalkulator zakłada, że {$code} ma kurs kupna, ale backend zwrócił null."
                );

                $this->assertEqualsWithDelta(
                    $mid - 0.15,
                    $buy,
                    0.0001,
                    "Buy dla {$code} powinno wynosić mid - 0.15"
                );

                $this->assertEqualsWithDelta(
                    $mid + 0.11,
                    $sell,
                    0.0001,
                    "Sell dla {$code} powinno wynosić mid + 0.11"
                );
            }

            if (in_array($code, $calcSellOnly, true)) {
                $this->assertTrue(
                    $buy === null,
                    "Kalkulator zakłada brak możliwości kupna dla {$code}, ale backend zwrócił buy != null."
                );

                $this->assertEqualsWithDelta(
                    $mid + 0.2,
                    $sell,
                    0.0001,
                    "Sell dla {$code} powinno wynosić mid + 0.2"
                );
            }
        }
    }
}
