import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { UserRound, LockKeyhole, Eye, EyeOff } from "lucide-react";

// TODO: sesuaikan path endpoint dengan Swagger backend
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const LOGIN_ENDPOINT = `${API_URL}/api/v1/auth/login`;

const Login = () => {
  const navigate = useNavigate();

  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      const res = await axios.post(LOGIN_ENDPOINT, { nik, password });
      const body = res.data;
      const payload = body?.data ?? body;
      const token =
        payload?.token ?? payload?.access_token ?? payload?.accessToken;
      const user = payload?.user ?? null;

      if (!token) {
        console.error("Response login tanpa token");
        throw new Error("Server tidak mengirim token login.");
      }

      // "Ingat Saya" -> localStorage (tetap login), jika tidak -> sessionStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", token);
      if (user) storage.setItem("user", JSON.stringify(user));

      await Swal.fire({
        icon: "success",
        title: "Berhasil Masuk",
        text: user?.name
          ? `Selamat datang, ${user.name}.`
          : "Selamat datang kembali.",
        timer: 1500,
        showConfirmButton: false,
      });

      const targetRoute =
        user?.role === "farmer"
          ? "/farmer"
          : user?.role === "middleman"
          ? "/middleman"
          : user?.role === "buyer"
          ? "/produk"
          : "/farmer";

      navigate(targetRoute, { replace: true });
    } catch (err) {
      let message = "Terjadi kesalahan. Silakan coba lagi.";

      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;

          // Ambil pesan hanya jika bertipe string (mencegah [object Object])
          const rawMessage =
            typeof data?.message === "string"
              ? data.message
              : typeof data?.error === "string"
              ? data.error
              : typeof data?.error?.message === "string"
              ? data.error.message
              : "";

          const lowerMsg = rawMessage.toLowerCase();

          if (
            status === 401 ||
            status === 400 ||
            /invalid|unauthorized|salah|not found|tidak ditemukan|credentials/.test(
              lowerMsg
            )
          ) {
            message =
              "NIK atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.";
          } else if (status === 404) {
            message =
              "Akun dengan NIK tersebut tidak ditemukan. Silakan daftar terlebih dahulu.";
          } else if (status >= 500) {
            message =
              "Server sedang mengalami gangguan. Silakan coba beberapa saat lagi.";
          } else if (rawMessage) {
            message = rawMessage;
          } else {
            message = "Login gagal. Periksa kembali NIK dan kata sandi Anda.";
          }
        } else {
          message =
            "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "Login Gagal",
        text: message,
        confirmButtonText: "Close",
        confirmButtonColor: "#185b32",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-end max-lg:justify-center overflow-hidden bg-white">
      {/* Background Image - Desktop Only */}
      <div
        className="
          absolute inset-0 hidden lg:block
          bg-[url('/bg-auth.png')]
          bg-[length:100%_100%]
          bg-no-repeat
        "
      />

      {/* Login Container */}
      <section
        className="
          relative z-10
          mr-[6%] w-[35.5%] -translate-y-[1.5%]
          max-lg:mr-0
          max-lg:w-full
          max-lg:max-w-[480px]
          max-lg:translate-y-0
          max-lg:px-6
        "
      >
        <div className="w-full">
          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-[27px] font-bold tracking-tight text-[#191919]">
              Masuk ke Akun
            </h1>

            <p className="mt-1 text-[14px] leading-7">
              Silakan masukkan Nomor Induk Kependudukan Anda untuk melanjutkan.
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* NIK */}
            <div className="space-y-2">
              <label
                htmlFor="nik"
                className="block pl-1 text-[12px] font-medium text-[#52617a]"
              >
                Nomor Induk Kependudukan
              </label>

              <div className="relative">
                <UserRound
                  size={16}
                  strokeWidth={1.8}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a2bd]"
                />

                <input
                  id="nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  autoComplete="username"
                  placeholder="Nomor Induk Kependudukan"
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                  required
                  className="
                    h-[46px] w-full rounded-[16px]
                    border border-[#dfe6ef]
                    bg-[#f7f9fb]
                    pl-11 pr-4
                    text-[14px] text-[#333]
                    outline-none transition-all
                    placeholder:text-[#91a2bd]
                    focus:border-[#185b32]
                    focus:ring-2 focus:ring-[#185b32]/10
                  "
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block pl-1 text-[12px] font-medium text-[#52617a]"
              >
                Kata Sandi
              </label>

              <div className="relative">
                <LockKeyhole
                  size={16}
                  strokeWidth={1.8}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#91a2bd]"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Kata Sandi Akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="
                    h-[46px] w-full rounded-[16px]
                    border border-[#dfe6ef]
                    bg-[#f7f9fb]
                    pl-11 pr-11
                    text-[14px] text-[#333]
                    outline-none transition-all
                    placeholder:text-[#91a2bd]
                    focus:border-[#185b32]
                    focus:ring-2 focus:ring-[#185b32]/10
                  "
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#91a2bd] transition-colors hover:text-[#52617a]"
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={1.8} />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded accent-[#185b32]"
              />

              <label
                htmlFor="remember"
                className="cursor-pointer text-[12px] text-[#52617a]"
              >
                Ingat Saya
              </label>
            </div>

            {/* Button Login */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="h-[48px] w-full rounded-[16px] text-[14px] font-semibold shadow-[0_7px_12px_rgba(0,0,0,0.16)] active:scale-[0.99]"
            >
              {submitting ? "Memproses..." : "Masuk Sekarang"}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center text-[12px] text-[#66615b]">
            Belum punya akun TANDUR?{" "}
            <Link
              to="/register"
              className="
                font-semibold text-[#00865b]
                transition-colors hover:text-[#006b48]
              "
            >
              Daftar Petani / Mitra Baru
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;