<?php

$csv = file_get_contents('./example.csv');

function expandMergedNames(string $mergedName, string $separator): array
{
    [$firstName, $secondName] = explode($separator, $mergedName);

    if (! str_contains($firstName, ' ')) {
        $parts = explode(' ', $secondName);
        $lastName = array_pop($parts);
        $firstName = "$firstName $lastName";

        if (explode(' ', $secondName) > 2) {
            $secondName = implode(' ', array_filter(
                explode(' ', $secondName), fn ($k) => $k !== 1, ARRAY_FILTER_USE_KEY)
            );
        }
    }

    return [$firstName, $secondName];
}

$split = explode(PHP_EOL, $csv);
$allNames = [];

foreach ($split as $key => $line) {
    if ($key === 0 || strlen($line) === 0) {
        continue;
    }
    $line = rtrim($line, ',');

    if (str_contains($line, ' and ')) {
        array_push($allNames, ...expandMergedNames($line, ' and '));
    } elseif (str_contains($line, ' & ')) {
        array_push($allNames, ...expandMergedNames($line, ' & '));
    } else {
        $allNames[] = $line;
    }
}

$namesArray = [];

foreach ($allNames as $name) {
    [$title, $firstName, $lastName] = explode(' ', $name);
    $final = ['title' => $title, 'first_name' => null, 'initial' => null];

    if ($final['title'] === 'Mister') {
        $final['title'] = 'Mr';
    }

    if (! $lastName) {
        $final['last_name'] = $firstName;
    } elseif (strlen(str_replace('.', '', $firstName)) === 1) {
        $final['initial'] = str_replace('.', '', $firstName);
        $final['last_name'] = $lastName;
    } else {
        $final['first_name'] = $firstName;
        $final['last_name'] = $lastName;
    }

    $namesArray[] = $final;
}

echo json_encode($namesArray, JSON_PRETTY_PRINT).PHP_EOL;
