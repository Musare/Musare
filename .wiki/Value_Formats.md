# Value Formats

Every input needs validation, below is the required formatting of each value.

- **User**
  - Username
    - Description: Any letter from a-z in any case, numbers, underscores and
    dashes. Must contain at least 1 letter or number.
    - Length: From 2 to 32 characters.
    - Regex: ```/^[A-Za-z0-9_]+$/```
  - Name
    - Description: Any letter from any language in any case, numbers, underscores,
    dashes, periods, apostrophes and spaces. Must contain at least 1 letter or number.
    - Length: From 2 to 64 characters.
    - Regex: ```/^[\p{L}0-9 .'_-]+$/u```
  - Email
    - Description: Standard email address.
    - Length: From 3 to 254 characters.
    - Regex: ```/^[\x00-\x7F]+@[a-z0-9]+\.[a-z0-9]+(\.[a-z0-9]+)?$/```
  - Password
    - Description: Must include at least one lowercase letter, one uppercase
    letter, one number and one special character.
    - Length: From 6 to 200 characters.
    - Regex: ```/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~])[A-Za-z\d!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/```
  - Ban Reason
    - Description: Any ASCII character.
    - Length: From 1 to 64 characters.
    - Regex: ```/^[\x00-\x7F]+$/```
- **Station**
  - Name
    - Description: Any letter from a-z lowercase, numbers and underscores.
    - Length: From 2 to 16 characters.
    - Regex: ```/^[a-z0-9_]+$/```
  - Display Name
    - Description: Any ASCII character.
    - Length: From 2 to 32 characters.
    - Regex: ```/^[\x00-\x7F]+$/```
  - Description
    - Description: Any character.
    - Length: From 2 to 200 characters.
- **Playlist**
  - Display Name
    - Description: Any ASCII character.
    - Length: From 1 to 64 characters.
    - Regex: ```/^[\x00-\x7F]+$/```
- **Song**
  - Title
    - Description: Any ASCII character.
    - Length: From 1 to 32 characters.
    - Regex: ```/^[\x00-\x7F]+$/```
  - Artists
    - Description: Any character and not NONE.
    - Length: From 1 to 64 characters.
    - Quantity: Min 1, max 10.
  - Genres
    - Description: Any ASCII character.
    - Length: From 1 to 32 characters.
    - Quantity: Min 1, max 16.
    - Regex: ```/^[\x00-\x7F]+$/```
  - Tags
    - Description: Any letter, numbers and underscores. Can be with out without
    data in square brackets. The base tag and data between brackets follow the
    same styling. If there's no data in between square brackets, there are no
    square brackets.
    - Length: From 1 to 64 characters for the base part, 1 to 64 characters for
    data in square brackets.
    - Regex: ```/^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/```
  - Thumbnail
    - Description: Valid url. If site is secure only https prepended urls are valid.
    - Length: From 1 to 256 characters.
