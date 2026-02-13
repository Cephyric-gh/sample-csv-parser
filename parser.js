#!/usr/bin/env node;

/**
 * Parses the CSV string to an array of names
 *
 * @param {string} csv
 * @returns {string[]}
 */
function csvToLines(csv) {
    // Split the string on new lines to get each line while ignoring the first
    // since it is the header row. Trim the trailing commas from the end to prevent
    // an empty column, which lets us ignore splitting it further as there is only
    // 1 column in the sample csv. Filter out any empty strings (from the end of the
    // file).
    const [_, ...rest] = csv
        .split('\n')
        .map((x) => x.replace(/,$/, ''))
        .filter((x) => x.length > 0);

    return rest;
}

/**
 * Looks for and splits out any lines with multiple names on it
 *
 * @param {string[]} lines
 * @return {string[]}
 */
function splitNames(lines) {
    const finishedLines = [];

    for (const line of lines) {
        // If we find the presence of "and" or "&" it can be assumed that the name is
        // 2 people merged together and needs expanding.
        if (line.indexOf(' and ') > 0) {
            finishedLines.push(...expandMergedNames(...line.split(' and ')));
        } else if (line.indexOf(' & ') > 0) {
            finishedLines.push(...expandMergedNames(...line.split(' & ')));
        } else {
            finishedLines.push(line);
        }
    }

    return finishedLines;
}

/**
 * Expands the first name to include the second if necessary
 *
 * @param {string} first
 * @param {string} second
 * @returns {[string, string]}
 */
function expandMergedNames(first, second) {
    if (first.indexOf(' ') === -1) {
        // If the first string is just 1 word we can assume that this is just a title,
        // and needs to be merged with the just the last name of the second string.
        // Always only takes the last name as it could be "Mr and Mrs Smith" or
        // "Dr & Mrs Joe Bloggs"
        first = `${first} ${second.split(' ').pop()}`;

        // Specifically split out the first name if present so it returns
        // "Mrs Bloggs", instead of "Mrs Joe Bloggs"
        if (second.split(' ').length > 2) {
            second = second
                .split(' ')
                .filter((_, i) => i !== 1)
                .join(' ');
        }
    }

    return [first, second];
}

/**
 * Convert the list of names into a structured JSON array
 *
 * @param {string[]} names
 * @return {{title: string, first_name: string | null, last_name: string, initial: string}[]}
 */
function namesToJson(names) {
    return names.map((name) => {
        // Title is always present so we can always add that to the output right away
        const [title, first, last] = name.split(' ');
        const final = { title, first_name: null, last_name: null, initial: null };

        // "Mister" and "Mr" are the same title, so ensure it aliases
        if (final.title === 'Mister') {
            final.title = 'Mr';
        }

        if (!last) {
            // When there is no found last name, we must assume that the name
            // provided is title + last_name, e.g. "Mr Smith"
            final.last_name = first;
        } else if (first.replace(/\.$/, '').length === 1) {
            // If the first name is either a single character, or 1 character and a .
            // then we need to populate the initial field instead of first name
            final.initial = first.replace(/\.$/, '');
            final.last_name = last;
        } else {
            // Otherwise we can assume it is just their first + last names.
            final.first_name = first;
            final.last_name = last;
        }

        return final;
    });
}

/**
 * Because the key layout of each object is the same order, converting each to
 * a string and passing them in and out of a Set provides a quick and dirty way
 * of detecting and removing duplicate entries.
 *
 * @param {{title: string, first_name: string | null, last_name: string, initial: string}[]} names
 * @returns {{title: string, first_name: string | null, last_name: string, initial: string}[]}
 */
function deduplicateEntries(names) {
    const set = new Set(names.map((name) => JSON.stringify(name)));

    return [...set].map((name) => JSON.parse(name));
}

let chunks = '';

// While reading stdin just add the chunks together
process.stdin.on('data', (data) => (chunks += data.toString()));

// Once stdin has been fully read we can evaluate the csv.
process.stdin.on('end', () => {
    const lines = csvToLines(chunks);
    const expandedNames = splitNames(lines);
    const json = namesToJson(expandedNames);

    // There is not enough context in the sample CSV to know for sure whether
    // deduplication of names is needed or not (since 2 people could have the
    // same name, but in more detailed context they may have different emails
    // or phone numbers, etc). If we wanted the deduplicated list we can simply
    // comment out the first line below and uncomment the 1 below it.
    console.log(json);
    // console.log(deduplicateEntries(json));
});
