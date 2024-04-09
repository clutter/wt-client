# WT

All notable changes to this project will be documented in this file.

## [v3.3.0] - Wednesday, April 3rd, 2024

- Delete dependency on react 18 types

## [v3.0.0] - Tuesday, Feb 16th, 2023

- Send track requests as JSON encoded `text/plain` to bypass CORS restrictions
- Add optional top level `schema` property
- Remove image fallback in favor of only using fetch (breaking change in allowed options)
- Require passing `metadata` key explicitly
  - Types will now only allow known properties, although a user could still provide unknown keys if types are removed
- Change `.set` API to allow setting both metadata and top level properties

## [v2.0.0] - Monday, April 18th, 2022

- Port library to TypeScript
- Refactor API
  - Replace "string identified" actions with methods on a class (e.g. `wt('initialize')` becomes `wt.initialize()`)
  - Refactor `track` API to remove ambiguity around `kind` property
    - Events should be tracked either as a single string (e.g. `pageview`) or a hash which includes an optional `kind` property, defaulting to `event`.
  - Rename inconsistent config options
    - `cookies` -> `cookieOptions`

## [v1.2.1] - Friday, April 23, 2021

- Send cookies in tracking request to preserve visitor association

## [v1.2.0] - Thursday, April 22, 2021

- Send events using window.fetch()
- Send event data in POST request body to avoid URI length limit

## [v1.1.1] - Thursday, November 19, 2020

- Update 'SEND_STARTED' event to emit after it has actually started sending.
- Update paramDefaults to be overridden by event data instead of the other way around.

## [v1.1.0] - Thursday, December 26, 2019

- If the visitor token is present in the query string, favor over the cookie
- Include the visitor token in the request environment arguments sent to the server

## [v1.0.16] - Wednesday, April 24, 2019

- If cookie is not set it will set with expiration of 20 years
- Also, if application calls wt('initialize') then default cookie expiration will not apply and must be provided

## [v1.0.15] - Monday, Jan 28, 2019

- Set wt_page_uuid cookie if not present

## [v1.0.14] - Monday, Dec 17, 2018

- Fix page uuid having different uuid for unbounce.

## [v1.0.13] - Wednesday, Dec 13, 2018

- Generate page uuid if it not present.

## [v1.0.12] - Wednesday, Dec 13, 2018

- Add page uuid to events.

## [v1.0.11] - Wednesday, May 30, 2018

- Add new fields to payload sent to WT server: page_name, container, position, object_type and object_name.

## [v1.0.10] - Thursday, May 3, 2018

- Stop using promises for legacy support

## [v1.0.9] - Thursday, May 3, 2018

- Fix for NPM import syntax

## [v1.0.8] - Monday, April 30, 2018

- Generate client cookie for WT

## [v1.0.7] - Monday, March 5, 2018

- Added first load handler

## [v1.0.6] - Friday, February 23, 2018

- Change spelling of referer to referrer

## [v1.0.5] - Thursday, February 22, 2018

- Encoded URL Properly

## [v1.0.4] - Thursday, February 22, 2018

- Added referrer as a value sent to the recipient image

## [v1.0.3] - Thursday, February 11, 2018

- Added better defaults for context

## [v1.0.2] - Thursday, February 8, 2018

- Updated readme and added default for events

## [v1.0.1] - Thursday, February 8, 2018

- Fixed an unpkg issue.

## [v1.0.0] - Thursday, February 8, 2018

- Created WT library for webtracking.
