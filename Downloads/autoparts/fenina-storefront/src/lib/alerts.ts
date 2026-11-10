import Swal from "sweetalert2";

// Shared toast used for every error/success message across the storefront:
// top-right corner, auto-dismisses on a timer (with a visible progress bar),
// pauses that timer on hover, and always has a close button so the visitor
// can dismiss it early instead of waiting it out.
const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  showCloseButton: true,
  timer: 4500,
  timerProgressBar: true,
  customClass: { popup: "fenina-toast" },
  didOpen: (el) => {
    el.addEventListener("mouseenter", Swal.stopTimer);
    el.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export function showSuccessToast(message: string) {
  toast.fire({ icon: "success", title: message });
}

export function showErrorToast(message: string) {
  toast.fire({ icon: "error", title: message });
}
