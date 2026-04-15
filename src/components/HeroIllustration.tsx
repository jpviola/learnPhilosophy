// Friendly SVG mascot — an abstract owl representing wisdom & learning

export function HeroIllustration() {
  return (
    <div class="animate-float" aria-hidden="true">
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Owl mascot representing learning and wisdom"
      >
        {/* Body */}
        <ellipse cx="60" cy="72" rx="30" ry="34" fill="#F4EEE8" stroke="#E5E7EB" stroke-width="1.5" />

        {/* Wings */}
        <ellipse cx="28" cy="78" rx="14" ry="20" fill="#E9DDD4" stroke="#D5C9BE" stroke-width="1" transform="rotate(-15 28 78)" />
        <ellipse cx="92" cy="78" rx="14" ry="20" fill="#E9DDD4" stroke="#D5C9BE" stroke-width="1" transform="rotate(15 92 78)" />

        {/* Tummy */}
        <ellipse cx="60" cy="80" rx="16" ry="18" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1" />

        {/* Head */}
        <circle cx="60" cy="40" r="26" fill="#F4EEE8" stroke="#E5E7EB" stroke-width="1.5" />

        {/* Ear tufts */}
        <polygon points="42,18 38,6 47,14" fill="#E9DDD4" stroke="#D5C9BE" stroke-width="1" stroke-linejoin="round" />
        <polygon points="78,18 82,6 73,14" fill="#E9DDD4" stroke="#D5C9BE" stroke-width="1" stroke-linejoin="round" />

        {/* Eyes — left */}
        <circle cx="50" cy="38" r="10" fill="white" stroke="#E5E7EB" stroke-width="1.5" />
        <circle cx="50" cy="38" r="6" fill="#2DD4BF" />
        <circle cx="50" cy="38" r="3.5" fill="#0F766E" />
        <circle cx="52" cy="36" r="1.5" fill="white" />

        {/* Eyes — right */}
        <circle cx="70" cy="38" r="10" fill="white" stroke="#E5E7EB" stroke-width="1.5" />
        <circle cx="70" cy="38" r="6" fill="#2DD4BF" />
        <circle cx="70" cy="38" r="3.5" fill="#0F766E" />
        <circle cx="72" cy="36" r="1.5" fill="white" />

        {/* Beak */}
        <polygon points="60,46 55,54 65,54" fill="#F59E0B" stroke="#D97706" stroke-width="0.5" stroke-linejoin="round" />

        {/* Feet */}
        <g fill="#F59E0B" stroke="#D97706" stroke-width="0.5">
          <rect x="48" y="102" width="5" height="10" rx="2" />
          <rect x="54" y="102" width="5" height="10" rx="2" />
          <rect x="61" y="102" width="5" height="10" rx="2" />
          <rect x="67" y="102" width="5" height="10" rx="2" />
        </g>

        {/* Small sparkles */}
        <circle cx="96" cy="24" r="2.5" fill="#8B5CF6" opacity="0.7" />
        <circle cx="104" cy="36" r="1.5" fill="#2DD4BF" opacity="0.6" />
        <circle cx="22" cy="28" r="2" fill="#F59E0B" opacity="0.6" />
        <circle cx="15" cy="42" r="1.5" fill="#8B5CF6" opacity="0.5" />
      </svg>
    </div>
  );
}
