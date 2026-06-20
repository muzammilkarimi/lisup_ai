export default function LisupIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 410 410"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <circle cx="200" cy="200" r="200" fill="#E07B39"/>

      <path d="M200 268 Q132 268 132 200 Q132 132 200 132 Q268 132 268 200 Q268 240 244 258"
        fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity="0.35"/>
      <path d="M200 248 Q152 248 152 200 Q152 152 200 152 Q248 152 248 200 Q248 226 230 240"
        fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity="0.52"/>
      <path d="M200 228 Q172 228 172 200 Q172 172 200 172 Q228 172 228 200 Q228 215 218 223"
        fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity="0.72"/>
      <path d="M200 212 Q188 212 188 200 Q188 188 200 188 Q212 188 212 200 Q212 207 207 210"
        fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity="0.90"/>

      <circle cx="200" cy="200" r="12" fill="#fff"/>
    </svg>
  )
}
