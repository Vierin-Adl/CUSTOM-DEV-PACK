# Commerce Ads

## Click Tags

Empty strings in `<head>` — filled by the ad server at runtime.

- `clickTag` — `.clickholder` (main click)
- `clickSpecialOffer1Tag` — `.banner__btn--1`
- `clickSpecialOffer2Tag` — `.banner__btn--2`
- `clickSpecialOffer3Tag` — `.banner__btn--3`

## Add a Click Zone

1. Add `var clickSpecialOfferNTag = '';` in `<head>`.
2. Add `data-action="special-offer-N"` to the element.
3. Add to `CLICK_MAP`: `{ action: 'special-offer-N', tagVar: 'clickSpecialOfferNTag' }`
