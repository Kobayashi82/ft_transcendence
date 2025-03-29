import React, { useState, useRef } from "react";
import {
  Edit2,
  CheckCircle,
  AlertTriangle,
  Mail,
  Calendar,
  MapPin,
  Globe,
} from "lucide-react";

interface User {
  username: string;
  fullName: string;
  email: string;
  location: string;
  bio: string;
  joinedDate: string;
  avatar: string;
  socialLinks: {
    github: string;
    website: string;
  };
}

interface ProfilePanelProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ user, setUser }) => {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    location: user.location,
    bio: user.bio,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Start editing
  const handleEditClick = () => {
    setEditing(true);
    setEditForm({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      location: user.location,
      bio: user.bio,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update user state with form data
      setUser((prev) => ({
        ...prev,
        ...editForm,
        // If we have a new avatar preview, use it (this is temporary until real upload)
        avatar: avatarPreview || prev.avatar,
      }));

      // Reset editing state
      setEditing(false);
      setSaveStatus("success");

      // Reset success message after a delay
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setSaveStatus("error");
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditing(false);
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-800 p-6">
        <h3 className="text-xl font-semibold text-white">
          Profile Information
        </h3>
        {!editing ? (
          <button
            onClick={handleEditClick}
            className="flex items-center text-indigo-400 hover:text-indigo-300 bg-gray-800 px-3 py-1 rounded-md"
          >
            <Edit2 size={16} className="mr-1" />
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-300 bg-gray-800 px-3 py-1 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="profile-form"
              className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md flex items-center"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? (
                <>
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
                  Saving...
                </>
              ) : (
                <>Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Save status message */}
      {saveStatus === "success" && (
        <div className="mx-6 mb-4 p-3 bg-green-900/30 border border-green-700 rounded-md text-green-300 text-sm flex items-center">
          <CheckCircle size={16} className="mr-2" />
          Profile updated successfully!
        </div>
      )}

      {saveStatus === "error" && (
        <div className="mx-6 mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-300 text-sm flex items-center">
          <AlertTriangle size={16} className="mr-2" />
          Failed to update profile. Please try again.
        </div>
      )}

      <div className="p-6">
        {editing ? (
          // Edit form
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-indigo-500">
                  {avatarPreview || user.avatar ? (
                    <img
                      src={avatarPreview || user.avatar}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-900/30">
                      <svg
                        className="h-12 w-12 text-indigo-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 border-2 border-gray-900 hover:bg-indigo-700 transition-colors"
                >
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={editForm.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={editForm.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={editForm.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={editForm.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={editForm.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </form>
        ) : (
          // View profile
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-400">Username</h4>
                <p className="mt-1 text-white">{user.username}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-400">Full Name</h4>
                <p className="mt-1 text-white">{user.fullName}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400">
                Email Address
              </h4>
              <div className="mt-1 flex items-center">
                <Mail size={16} className="text-gray-500 mr-2" />
                <p className="text-white">{user.email}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400">Joined Date</h4>
              <div className="mt-1 flex items-center">
                <Calendar size={16} className="text-gray-500 mr-2" />
                <p className="text-white">
                  {new Date(user.joinedDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400">Location</h4>
              <div className="mt-1 flex items-center">
                <MapPin size={16} className="text-gray-500 mr-2" />
                <p className="text-white">{user.location}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400">Bio</h4>
              <p className="mt-1 text-white">{user.bio}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400">
                Social Links
              </h4>
              <div className="mt-2 space-y-2">
                {user.socialLinks.github && (
                  <div className="flex items-center">
                    <Globe size={16} className="text-gray-500 mr-2" />
                    <a
                      href={`https://${user.socialLinks.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      {user.socialLinks.github}
                    </a>
                  </div>
                )}
                {user.socialLinks.website && (
                  <div className="flex items-center">
                    <Globe size={16} className="text-gray-500 mr-2" />
                    <a
                      href={`https://${user.socialLinks.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      {user.socialLinks.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePanel;
