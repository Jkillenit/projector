import { TextLink } from "../../components/ui/index.jsx";
import { mapLink } from "./locations.js";

/**
 * "Show on map" for anything with a place (#209): opens the map on that pin with its place panel open.
 * Says "Online" for online places, and adds "Location not checked yet" for unchecked rows. Nothing when there is no place.
 */
export function ShowOnMap({ locationId, where, online, className }) {
  const link = mapLink({ locationId, where, online });
  if (!link) return null;
  return (
    <span className={["show-on-map", className].filter(Boolean).join(" ")}>
      {link.href ? <TextLink href={link.href}>Show on map</TextLink> : null}
      {link.note ? <span className="t-small t-faint">{link.note}</span> : null}
    </span>
  );
}
