import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  EyeIcon,
  EyeOffIcon,
  AtSignIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    general: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Password strength validation
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Validate password in real-time
    if (name === "password") {
      setPasswordValidation({
        minLength: value.length >= 8,
        hasLower: /[a-z]/.test(value),
        hasUpper: /[A-Z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      });
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      general: "",
    };

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
        isValid = false;
      }
    }

    // Validate username
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      isValid = false;
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else {
      const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
      if (!passwordPattern.test(formData.password)) {
        newErrors.password = "Password does not meet the requirements";
        isValid = false;
      }
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock successful registration
      console.log("Registration successful", formData);

      // Redirect to login
      navigate("/login", { state: { registered: true } });
    } catch (error) {
      console.error("Registration error:", error);
      setErrors((prev) => ({
        ...prev,
        general: "Registration failed. Please try again.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Implement Google OAuth signup
    console.log("Google signup clicked");
  };

  const handle42Signup = () => {
    // Implement 42 OAuth signup
    console.log("42 signup clicked");
  };

  // Check if the password meets all criteria
  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasLower &&
    passwordValidation.hasUpper &&
    passwordValidation.hasNumber &&
    passwordValidation.hasSpecial;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute w-96 h-96 bg-indigo-500 rounded-full opacity-10 blur-3xl -top-20 -right-20"></div>
        <div className="absolute w-96 h-96 bg-purple-500 rounded-full opacity-10 blur-3xl bottom-20 left-1/4"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">FT</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-white">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Or{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-gray-900 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-800">
          {/* Error message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300 text-sm">
              {errors.general}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSignIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.email ? "border-red-500" : "border-gray-700"
                  } rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="name@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300"
              >
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="new-username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${
                    errors.username ? "border-red-500" : "border-gray-700"
                  } rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.password
                      ? "border-red-500"
                      : isPasswordValid
                      ? "border-green-500"
                      : "border-gray-700"
                  } rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}

              {/* Password strength indicator */}
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">
                  Password requirements:
                </p>
                <ul className="space-y-1">
                  <li className="text-xs flex items-center">
                    {passwordValidation.minLength ? (
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        passwordValidation.minLength
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      At least 8 characters
                    </span>
                  </li>
                  <li className="text-xs flex items-center">
                    {passwordValidation.hasLower ? (
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        passwordValidation.hasLower
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      Lowercase letter
                    </span>
                  </li>
                  <li className="text-xs flex items-center">
                    {passwordValidation.hasUpper ? (
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        passwordValidation.hasUpper
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      Uppercase letter
                    </span>
                  </li>
                  <li className="text-xs flex items-center">
                    {passwordValidation.hasNumber ? (
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        passwordValidation.hasNumber
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      Number
                    </span>
                  </li>
                  <li className="text-xs flex items-center">
                    {passwordValidation.hasSpecial ? (
                      <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <XCircleIcon className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        passwordValidation.hasSpecial
                          ? "text-green-400"
                          : "text-gray-400"
                      }
                    >
                      Special character (!@#$%^&*(),.?":{}|&lt;&gt;)
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300"
              >
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : formData.confirmPassword &&
                        formData.password === formData.confirmPassword
                      ? "border-green-500"
                      : "border-gray-700"
                  } rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : null}
                Create Account
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">
                  Or sign up with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleSignup}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-700 rounded-md shadow-sm bg-gray-800 hover:bg-gray-700 text-sm font-medium text-gray-300"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path
                      fill="#4285F4"
                      d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                    />
                    <path
                      fill="#34A853"
                      d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                    />
                  </g>
                </svg>
                Google
              </button>

              <button
                onClick={handle42Signup}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-700 rounded-md shadow-sm bg-gray-800 hover:bg-gray-700 text-sm font-medium text-gray-300"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 333 333"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g>
                    <path fill="#01babc" d="M333.333 0H0v333.333h333.333V0z" />
                    <path
                      fill="#fff"
                      d="M183.467 130.198H150.2V96.93h33.267v33.268zm-66.534 0H83.666V96.93h33.267v33.268zm66.534 66.532H150.2v-33.266h33.267v33.266zm-66.534 0H83.666v-33.266h33.267v33.266zm66.534 66.536H150.2V230h33.267v33.266zm-66.534 0H83.666V230h33.267v33.266z"
                    />
                  </g>
                </svg>
                42
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          By signing up, you agree to our{" "}
          <Link to="/terms" className="text-indigo-400 hover:text-indigo-300">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-indigo-400 hover:text-indigo-300">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Register;
