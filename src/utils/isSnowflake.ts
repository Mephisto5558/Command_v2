export function isSnowflake(str: string & {} | Snowflake): str is Snowflake {
  /* No snowflake will be smaller than 17 digits:            https://snowsta.mp/?s=10000000000000000
     No snowflake will be longer  than 19 digits until 2090: https://snowsta.mp/?s=9999999999999999999 */
  return /^\d{17,19}$/.test(str);
}