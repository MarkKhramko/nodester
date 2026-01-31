# Decoder | nodester Query Language (NQL)

The NQL decoder is responsible for converting URL-encoded query strings into readable text that can be parsed by the query lexer. It handles both standard ASCII special characters and multi-byte UTF-8 sequences for international character support.

## How It Works

When a request reaches a nodester application with query parameters:

1. **URL Decoding**: The query string is decoded from URL-encoded format
2. **Character Processing**: Each character or encoded sequence is processed
3. **UTF-8 Handling**: Multi-byte sequences are properly decoded to UTF-8 characters
4. **Output**: A clean, decoded query string is passed to the lexer

## URL Encoding Support

The decoder handles all standard URL-encoded characters automatically:

### ASCII Special Characters

Common special characters are decoded using an optimized dictionary lookup:

| Encoded | Decoded | Description |
|---------|---------|-------------|
| `%20` | ` ` | Space |
| `%26` | `&` | Ampersand |
| `%3D` | `=` | Equals sign |
| `%28` | `(` | Left parenthesis |
| `%29` | `)` | Right parenthesis |
| `%2C` | `,` | Comma |
| `%2E` | `.` | Period |
| `%3A` | `:` | Colon |
| `%3F` | `?` | Question mark |
| `%5B` | `[` | Left bracket |
| `%5D` | `]` | Right bracket |

See the full list in `lib/middlewares/ql/sequelize/decoder/encodes.js`.

### Multi-Byte UTF-8 Characters

The decoder automatically handles international characters that require multiple bytes:

**Cyrillic:**
```
?name=like(%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0)
// Decodes to: name=like(книга)
```

**Diacritics:**
```
?salad=like(%C5%A1opska)
// Decodes to: salad=like(šopska)
```

**Chinese:**
```
?title=like(%E4%BD%A0%E5%A5%BD)
// Decodes to: title=like(你好)
```

**Emoji:**
```
?content=like(%F0%9F%8E%89)
// Decodes to: content=like(🎉)
```

## Technical Details

### Multi-Byte Sequence Handling

UTF-8 characters can require 1-4 bytes:

| Character Type | Bytes | Example | Encoding |
|----------------|-------|---------|----------|
| ASCII | 1 | `A` | `%41` |
| Latin Extended | 2 | `š` | `%C5%A1` |
| Cyrillic | 2 | `к` | `%D0%BA` |
| Chinese | 3 | `你` | `%E4%BD%A0` |
| Emoji | 4 | `🎉` | `%F0%9F%8E%89` |

The decoder collects all consecutive `%XX` tokens and decodes them as a complete UTF-8 sequence using Node.js Buffer.

### Performance Optimization

The decoder uses a two-tier approach:

1. **Dictionary Lookup** (fast path): Single-byte sequences are checked against the `ENCODES` dictionary first
2. **UTF-8 Decoding** (fallback): Multi-byte sequences or unknown single bytes are decoded using Buffer

This ensures optimal performance for common ASCII characters while supporting the full UTF-8 character set.

## Examples

### Basic Query with Spaces
```
GET /api/v1/countries?name=like(New%20York)
// Decoded: name=like(New York)
```

### International Characters
```
GET /api/v1/books?title=like(%D0%92%D0%BE%D0%B9%D0%BD%D0%B0%20%D0%B8%20%D0%BC%D0%B8%D1%80)
// Decoded: title=like(Война и мир)
// Searches for "War and Peace" in Russian
```

### Mixed Content
```
GET /api/v1/products?name=like(Caf%C3%A9%20%26%20Restaurant)
// Decoded: name=like(Café & Restaurant)
```

### Complex Query
```
GET /api/v1/cities?name=like(%C5%A0opska)&country=like(Bulg%C3%A1ria)
// Decoded: name=like(Šopska)&country=like(Bulgária)
```

## Error Handling

If the decoder encounters a malformed UTF-8 sequence, it will throw an error:

```js
{
  "error": {
    "message": "Failed to decode UTF-8 sequence at index 15: %D0%XX",
    "status": 422
  }
}
```

Common causes:
- Incomplete percent-encoded sequence (e.g., `%D0` without following bytes)
- Invalid hex values in encoding
- Truncated multi-byte sequences

## Best Practices

1. **Always URL-encode special characters** in query values
2. **Use proper UTF-8 encoding** for international characters
3. **Test with various character sets** if supporting international users
4. **Handle encoding client-side** using `encodeURIComponent()` in JavaScript

**JavaScript Example:**
```js
const query = `name=like(${encodeURIComponent('книга')})`;
// Produces: name=like(%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0)
```

## Implementation

The decoder is located at:
- **Main logic**: `lib/middlewares/ql/sequelize/decoder/index.js`
- **ASCII dictionary**: `lib/middlewares/ql/sequelize/decoder/encodes.js`

It is automatically invoked by the NQL middleware before query parsing.

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
