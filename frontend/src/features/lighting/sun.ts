/**
 * Sunrise and sunset from the standard solar-position equations (the same approach as the
 * NOAA calculator). Pure JS, no API key. Accurate to a minute or two at Seattle's latitude.
 */
const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const J0 = 0.0009;
const OBLIQUITY = RAD * 23.4397;
/** Sun's upper edge on the horizon, with refraction. */
const HORIZON = RAD * -0.833;

function toJulian(date: Date) {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(julian: number) {
  return new Date((julian + 0.5 - J1970) * DAY_MS);
}

function meanAnomaly(days: number) {
  return RAD * (357.5291 + 0.98560028 * days);
}

function eclipticLongitude(anomaly: number) {
  const center = RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
  return anomaly + center + RAD * 102.9372 + Math.PI;
}

function transit(days: number, anomaly: number, longitude: number) {
  return J2000 + days + 0.0053 * Math.sin(anomaly) - 0.0069 * Math.sin(2 * longitude);
}

export type SunTimes = { sunrise: Date; sunset: Date };

/** Sunrise and sunset for the solar day nearest `date`, or null near the poles. */
export function sunTimes(date: Date, lat: number, lng: number): SunTimes | null {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const days = toJulian(date) - J2000;
  const cycle = Math.round(days - J0 - lw / (2 * Math.PI));
  const approx = J0 + lw / (2 * Math.PI) + cycle;
  const anomaly = meanAnomaly(approx);
  const longitude = eclipticLongitude(anomaly);
  const declination = Math.asin(Math.sin(OBLIQUITY) * Math.sin(longitude));
  const noon = transit(approx, anomaly, longitude);
  const cosHour =
    (Math.sin(HORIZON) - Math.sin(phi) * Math.sin(declination)) / (Math.cos(phi) * Math.cos(declination));
  if (cosHour < -1 || cosHour > 1) return null;
  const hourAngle = Math.acos(cosHour);
  const setApprox = J0 + (hourAngle + lw) / (2 * Math.PI) + cycle;
  const set = transit(setApprox, anomaly, longitude);
  const rise = noon - (set - noon);
  return { sunrise: fromJulian(rise), sunset: fromJulian(set) };
}

export function isDaylight(date: Date, lat: number, lng: number): boolean {
  const times = sunTimes(date, lat, lng);
  if (!times) return false;
  return date >= times.sunrise && date <= times.sunset;
}
