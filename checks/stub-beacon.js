/* One test switch, defined once.

   The analytics beacon is served from static.cloudflareinsights.com. Some
   machines cannot reach that host: this one refuses it outright, so on a
   build that carries the beacon the request fails there and nowhere else,
   and a check that watches for failed requests reports the machine rather
   than the site.

   With STUB_BEACON=1 that one host is answered locally with an empty
   script, so the page loads the way it will in the world. The switch is
   opt in: with the variable unset nothing is intercepted at all, which is
   the default everywhere, and the staging build carries no beacon anyway.

   It matches on the parsed hostname, exactly, rather than on a glob: a
   pattern like the one this replaced would also have matched a URL that
   merely contained the host name somewhere in its path. Nothing else is
   intercepted, and nothing is ever sent anywhere.                       */
const HOST = 'static.cloudflareinsights.com';

async function stubBeacon(page) {
  if (!process.env.STUB_BEACON) { return false; }
  await page.route(
    url => { try { return new URL(url).hostname === HOST; } catch (e) { return false; } },
    route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
  return true;
}

module.exports = { stubBeacon, HOST };
