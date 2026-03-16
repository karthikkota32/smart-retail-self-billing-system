import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterNavbar from "../components/MasterNavbar";
import { getProfile, updateProfile } from "../services/api";
import "../styles/Profile.css";

function Profile() {
  const navigate = useNavigate();
  const userPhone = localStorage.getItem("userPhone");
  const userRole = localStorage.getItem("userRole");
  const username = localStorage.getItem("username");

  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!userPhone) {
      navigate("/");
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await getProfile(userPhone);
        if (res.ok) {
          setProfileData(res);
          setEditForm({
            username: res.username || username || "",
            email: res.email || "",
            phone: res.phone || userPhone
          });
        } else {
          console.error("Failed to load profile");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userPhone, navigate, username]);

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setErrorMessage("");
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setErrorMessage("");
  };

  const saveProfile = async () => {
    if (!editForm.username || !editForm.email) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile(userPhone, {
        username: editForm.username,
        email: editForm.email
      });

      if (res.ok) {
        setProfileData(prev => ({
          ...prev,
          username: editForm.username,
          email: editForm.email
        }));
        localStorage.setItem("username", editForm.username);
        alert("✅ Profile updated successfully");
        setIsEditing(false);
      } else {
        setErrorMessage(res.message || "Failed to update profile");
      }
    } catch {
      setErrorMessage("Error updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      setErrorMessage("Please fill in all password fields");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile(userPhone, {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.ok) {
        alert("✅ Password changed successfully");
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setIsChangingPassword(false);
      } else {
        setErrorMessage(res.message || "Failed to change password");
      }
    } catch {
      setErrorMessage("Error changing password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("userPhone");
      localStorage.removeItem("username");
      localStorage.removeItem("userRole");
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <MasterNavbar />
        <div className="loading-message">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <MasterNavbar />

      <div className="profile-header">
        <h1>👤 My Profile</h1>
        <p>Manage your account information</p>
      </div>

      <div className="profile-container">
        <div className="profile-card">
          {!isEditing && !isChangingPassword ? (
            <>
              <div className="profile-display">
                <div className="profile-field">
                  <label>Username</label>
                  <p>{profileData?.username || username || "N/A"}</p>
                </div>

                <div className="profile-field">
                  <label>Email</label>
                  <p>{profileData?.email || "Not set"}</p>
                </div>

                <div className="profile-field">
                  <label>Phone Number</label>
                  <p>{userPhone}</p>
                </div>

                <div className="profile-field">
                  <label>Role</label>
                  <p className="role-badge">
                    {userRole === "admin" ? "👨‍💼 Admin" : "👤 Customer"}
                  </p>
                </div>
              </div>

              <div className="profile-actions">
                <button onClick={() => setIsEditing(true)} className="btn-edit-profile">
                  ✏️ Edit Profile
                </button>
                <button onClick={() => setIsChangingPassword(true)} className="btn-change-password">
                  🔐 Change Password
                </button>
                <button onClick={handleLogout} className="btn-logout">
                  🚪 Logout
                </button>
              </div>
            </>
          ) : isEditing ? (
            <>
              <div className="profile-form">
                <h3>Edit Profile</h3>
                
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => handleEditChange("username", e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleEditChange("email", e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label>Phone (Read-only)</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    disabled
                    className="input-field disabled"
                  />
                </div>

                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <div className="form-actions">
                  <button
                    onClick={saveProfile}
                    disabled={isSaving}
                    className="btn-save"
                  >
                    {isSaving ? "⏳ Saving..." : "✅ Save Changes"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-cancel"
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            </>
          ) : isChangingPassword ? (
            <>
              <div className="profile-form">
                <h3>Change Password</h3>
                
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => handlePasswordChange("oldPassword", e.target.value)}
                    className="input-field"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                    className="input-field"
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                    className="input-field"
                    placeholder="Confirm new password"
                  />
                </div>

                <p className="password-hint">Password must be at least 6 characters</p>

                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <div className="form-actions">
                  <button
                    onClick={changePassword}
                    disabled={isSaving}
                    className="btn-save"
                  >
                    {isSaving ? "⏳ Saving..." : "✅ Change Password"}
                  </button>
                  <button
                    onClick={() => setIsChangingPassword(false)}
                    className="btn-cancel"
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Profile;
