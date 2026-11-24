# Walkies website

Static rebuild of walkiesbath.co.uk. There's no Squarespace and nothing to pay for hosting.

- `sites/<site>/site.json`: all text, prices, contact details, colours and fonts for one site
- `build.js`: builds the pages into `dist/<site>/`
- Every push to `main` rebuilds and redeploys automatically (GitHub Pages)

## Edit text or prices
Edit `sites/walkies-bath/site.json` on GitHub and commit. The site updates in about a minute.

## Booking (Acuity / Squarespace Scheduling)
In Acuity go to **Scheduling Page → Embed Options**, copy the `src="…"` URL out of the iframe code
(it looks like `https://app.acuityscheduling.com/schedule.php?owner=12345678`), and paste it into
`booking.embedUrl` in site.json. Until then, Book Now shows a button that links to your scheduling page.

## Splitting into two fields
Copy `sites/walkies-bath` to e.g. `sites/walkies-bathampton`, delete the other paddock from
`paddocks`, then change the name, contact details, booking embed and hero text. A site with one
paddock automatically shows "Our Paddock" instead of a dropdown. Deploy it as a second site
(a second repo, or Cloudflare Pages / Netlify with build command `node build.js walkies-bathampton`).

## Custom domain
Repo → Settings → Pages → Custom domain → `www.walkiesbath.co.uk`. Then at your domain registrar,
point a CNAME for `www` to `<username>.github.io` and add the four GitHub A records for the root domain.
