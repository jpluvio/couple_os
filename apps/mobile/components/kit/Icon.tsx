import Svg, { Path, Circle, Rect } from "react-native-svg";

/**
 * Icone disegnate, non emoji. Le emoji cambiano forma su ogni piattaforma,
 * non si ricolorano e leggono come provvisorie.
 *
 * Tutte su griglia 24, stroke coerente.
 */
export type IconName =
  | "home" | "calendar" | "house" | "money" | "heart"
  | "bell" | "cart" | "plus" | "minus" | "check" | "chevronUp" | "chevronDown"
  | "board" | "chat" | "image" | "trash" | "close" | "search";

const PATHS: Record<IconName, string[]> = {
  home:        ["M3 10.5 12 3l9 7.5", "M5 9.5V20h14V9.5"],
  calendar:    ["M6 2v4M18 2v4M3 9h18", "M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"],
  house:       ["M4 6h16M4 12h16M4 18h10"],
  money:       ["M12 1v22", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
  heart:       ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"],
  bell:        ["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"],
  cart:        ["M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 7H6"],
  plus:        ["M12 5v14M5 12h14"],
  minus:       ["M5 12h14"],
  check:       ["M20 6 9 17l-5-5"],
  chevronUp:   ["m18 15-6-6-6 6"],
  chevronDown: ["m6 9 6 6 6-6"],
  board:       ["M3 3h18v13H7l-4 4z"],
  chat:        ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  image:       ["m21 15-5-5L5 21"],
  trash:       ["M3 6h18", "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"],
  close:       ["M18 6 6 18M6 6l12 12"],
  search:      ["m21 21-4.3-4.3"],
};

const EXTRA: Partial<Record<IconName, "cart" | "image" | "search">> = {
  cart: "cart", image: "image", search: "search",
};

export function Icon({
  name,
  size = 20,
  color = "#1a1714",
  width = 1.6,
}: {
  name: IconName;
  size?: number;
  color?: string;
  width?: number;
}) {
  const extra = EXTRA[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {extra === "cart" && (
        <>
          <Circle cx={9} cy={20} r={1.4} stroke={color} strokeWidth={width} />
          <Circle cx={18} cy={20} r={1.4} stroke={color} strokeWidth={width} />
        </>
      )}
      {extra === "image" && (
        <>
          <Rect x={3} y={3} width={18} height={18} rx={2} stroke={color} strokeWidth={width} />
          <Circle cx={8.5} cy={8.5} r={1.5} stroke={color} strokeWidth={width} />
        </>
      )}
      {extra === "search" && (
        <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={width} />
      )}
    </Svg>
  );
}
