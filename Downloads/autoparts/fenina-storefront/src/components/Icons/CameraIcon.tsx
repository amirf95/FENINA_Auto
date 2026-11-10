function CameraIcon() {
  return (
    <svg className="h-6 w-6 text-black/45" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5C4 6.67 4.67 6 5.5 6h2l1-1.5h7l1 1.5h2c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5h-13C4.67 19 4 18.33 4 17.5v-10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export default CameraIcon;