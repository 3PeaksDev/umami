import {
  EMAIL_DOMAINS,
  PAID_AD_PARAMS,
  SEARCH_DOMAINS,
  SHOPPING_DOMAINS,
  SOCIAL_DOMAINS,
  VIDEO_DOMAINS,
} from '@/lib/constants';

/**
 * Builds an `ilike` OR-clause for a column against a list of substrings, matching
 * the stock `toPostgresLikeClause` used by getChannelMetrics.
 */
function likeClause(column: string, values: string[]) {
  return values.map(val => `${column} ilike '%${val.replace(/'/g, "''")}%'`).join(' OR ');
}

/**
 * Returns Umami's stock channel-classification CASE expression (the Postgres
 * relationalQuery path from getChannelMetrics), parameterized by a column alias
 * prefix so it can run over any subquery/CTE exposing the referrer/utm/hostname
 * columns. Reused verbatim across the fleet queries so attribution stays
 * identical to the per-site dashboards (AI engines such as chatgpt.com /
 * perplexity.ai remain in SEARCH_DOMAINS, i.e. classified as organic search).
 *
 * @param p column prefix, e.g. `ft.` for a `first_touch` alias, or '' for bare columns.
 */
export function channelCaseSql(p = ''): string {
  const prefix = `case when ${p}utm_medium LIKE 'p%' OR ${p}utm_medium LIKE '%ppc%' OR ${p}utm_medium LIKE '%retargeting%' OR ${p}utm_medium LIKE '%paid%' then 'paid' else 'organic' end`;

  return `case
    when ${p}referrer_domain = '' and ${p}url_query = '' then 'direct'
    when ${likeClause(`${p}url_query`, PAID_AD_PARAMS)} then 'paidAds'
    when ${likeClause(`${p}utm_medium`, ['referral', 'app', 'link'])} then 'referral'
    when ${p}utm_medium ilike '%affiliate%' then 'affiliate'
    when ${p}utm_medium ilike '%sms%' or ${p}utm_source ilike '%sms%' then 'sms'
    when ${likeClause(`${p}referrer_domain`, SEARCH_DOMAINS)} or ${p}utm_medium ilike '%organic%' then concat(${prefix}, 'Search')
    when ${likeClause(`${p}referrer_domain`, SOCIAL_DOMAINS)} then concat(${prefix}, 'Social')
    when ${likeClause(`${p}referrer_domain`, EMAIL_DOMAINS)} or ${p}utm_medium ilike '%mail%' then 'email'
    when ${likeClause(`${p}referrer_domain`, SHOPPING_DOMAINS)} or ${p}utm_medium ilike '%shop%' then concat(${prefix}, 'Shopping')
    when ${likeClause(`${p}referrer_domain`, VIDEO_DOMAINS)} or ${p}utm_medium ilike '%video%' then concat(${prefix}, 'Video')
    when ${p}referrer_domain != regexp_replace(${p}hostname, '^www.', '') and ${p}referrer_domain != '' then 'referral'
    else 'direct' end`;
}
