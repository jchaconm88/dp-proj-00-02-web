const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.match(/\.tsx?$/)) { 
            results.push(file);
        }
    });
    return results;
}

// Convert from Buffer (bytes) to UTF-8 over and over
function decodeCorruptedUtf8(buf) {
    // Some files were passed through Out-String and saved to Windows-1252 ANSI, then read as UTF-8.
    // We can simply try decoding it treating the buffer's utf8 characters as Latin1 bytes.
    let text = buf.toString('utf8');
    
    // We can simulate the fix using hex strings:
    let prevText = text;
    const fixMap = {
        // Nivel 3
        '\xC3\x83\xC6\x92\xC3\x82\xC2\xB3': 'ó',
        '\xC3\x83\xC6\x92\xC3\x82\xC2\xA1': 'á',
        '\xC3\x83\xC6\x92\xC3\x82\xC2\xA9': 'é',
        '\xC3\x83\xC6\x92\xC3\x82\xC2\xAD': 'í',
        '\xC3\x83\xC6\x92\xC3\x82\xC2\xBA': 'ú',
        '\xC3\x83\xC6\x92\xC3\x82\xC2\xB1': 'ñ',

        '\xC3\x83\xC6\x92\xC3\xA2\xE2\x82\xAC\xEF\xBF\xBD': 'Ó',
        '\xC3\x83\xC6\x92\xC3\xA2\xE2\x82\xAC\xCB\x9C': 'Ñ',
        '\xC3\x83\xC6\x92\xC3\x85\xC2\xAE': 'Ú',
        '\xC3\x83\xC6\x92\xC3\xA2\xE2\x82\xAC\xED\xA0\xBD\xED\xB2\xAA': 'É',
        
        // Nivel 2
        '\xC3\x83\xC2\xB3': 'ó',
        '\xC3\x83\xC2\xA1': 'á',
        '\xC3\x83\xC2\xA9': 'é',
        '\xC3\x83\xC2\xAD': 'í',
        '\xC3\x83\xC2\xBA': 'ú',
        '\xC3\x83\xC2\xB1': 'ñ',

        '\xC3\x83\xEF\xBF\xBD': 'Á',
        '\xC3\x83\xE2\x80\xB0': 'É',
        '\xC3\x83\x8D': 'Í',     // not sure
        '\xC3\x83\xE2\x80\x9C': 'Ó',
        '\xC3\x83\xEF\xBF\xBD': 'Ú',
        '\xC3\x83\xE2\x80\x98': 'Ñ',

        // Nivel 1
        '\xC3\xB3': 'ó',
        '\xC3\xA1': 'á',
        '\xC3\xA9': 'é',
        '\xC3\xAD': 'í',
        '\xC3\xBA': 'ú',
        '\xC3\xB1': 'ñ',
        
        '\xC3\x81': 'Á',
        '\xC3\x89': 'É',
        '\xC3\x8D': 'Í',
        '\xC3\x93': 'Ó',
        '\xC3\x9A': 'Ú',
        '\xC3\x91': 'Ñ'
    };
    
    // There are some other literal string artifacts like "Ã¢â‚¬Â¦" ('...')
    const fixMapStr = {
        'ÃƒÆ’Ã‚Â³': 'ó',
        'ÃƒÆ’Ã‚Â¡': 'á',
        'ÃƒÆ’Ã‚Â©': 'é',
        'ÃƒÆ’Ã‚Â­': 'í',
        'ÃƒÆ’Ã‚Âº': 'ú',
        'ÃƒÆ’Ã‚Â±': 'ñ',
        'ÃƒÂ³': 'ó',
        'ÃƒÂ¡': 'á',
        'ÃƒÂ©': 'é',
        'ÃƒÂ­': 'í',
        'ÃƒÂº': 'ú',
        'ÃƒÂ±': 'ñ',
        
        'Ã³': 'ó',
        'Ã¡': 'á',
        'Ã©': 'é',
        'Ã­': 'í',
        'Ãº': 'ú',
        'Ã±': 'ñ',
        
        'Ã“': 'Ó',
        'Ã': 'Á',
        'Ã‰': 'É',
        'Ã': 'Í',
        'Ãš': 'Ú',
        'Ã‘': 'Ñ',

        'Ã¢â‚¬Â¦': '...',
        'Ã‚Âº': 'º',
        'Ã¢â€ Â ': '←',
        'Ã‚Â¿': '¿',
        'Ãƒâ€¦': 'Å'
    }

    const keysStr = Object.keys(fixMapStr).sort((a,b) => b.length - a.length);
    for (const key of keysStr) {
        text = text.split(key).join(fixMapStr[key]);
    }

    const keys = Object.keys(fixMap).sort((a,b) => b.length - a.length);
    for (const key of keys) {
        text = text.split(key).join(fixMap[key]);
    }
    
    return text;
}

const files = walk('./app');
let fixedCount = 0;
for (const f of files) {
    let buf = fs.readFileSync(f);
    let original = buf.toString('utf8');
    let fixed = decodeCorruptedUtf8(buf);
    
    if (original !== fixed) {
        fs.writeFileSync(f, fixed, 'utf8');
        fixedCount++;
        console.log('Fixed', f);
    }
}
console.log('Total files fixed: ' + fixedCount);
