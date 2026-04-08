import React, { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { AppTheme, Fonts } from "../../constants/theme";
import { showAlert } from "../../lib/alert";
import { useAuth } from "../../lib/auth-context";
import { useHousehold } from "../../lib/household-context";
import { supabase } from "../../lib/supabase";

const COMMON_ALLERGIES = [
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Eggs",
  "Soy",
  "Wheat",
  "Shellfish",
  "Fish",
] as const;

type ProfileModal =
  | null
  | "name"
  | "email"
  | "password"
  | "allergies"
  | "members"
  | "household-name"
  | "household-code";

export default function Profile() {
  const { session } = useAuth();
  const { userProfile, household, members, refresh, setHouseholdState, updateProfileState } =
    useHousehold();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [activeModal, setActiveModal] = useState<ProfileModal>(null);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [otherAllergy, setOtherAllergy] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editHouseholdName, setEditHouseholdName] = useState("");
  const [saving, setSaving] = useState(false);

  const displayName =
    userProfile?.display_name ?? session?.user.user_metadata?.display_name ?? "User";
  const email = session?.user.email ?? "";
  const myMember = members.find((member) => member.user_id === session?.user.id);
  const allergySummary = useMemo(
    () => [
      ...selectedAllergies,
      ...(otherAllergy.trim() ? [otherAllergy.trim()] : []),
    ],
    [otherAllergy, selectedAllergies]
  );

  const saveAvatar = async (avatarUrl: string | null) => {
    if (!session?.user.id || !userProfile) {
      showAlert("Error", "You need to be signed in to update your photo.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", session.user.id);

      if (error) {
        throw error;
      }

      updateProfileState({ ...userProfile, avatar_url: avatarUrl });
      showAlert(
        avatarUrl ? "Photo updated" : "Photo removed",
        avatarUrl
          ? "Your profile picture has been updated."
          : "Your profile picture has been removed.",
      );
    } catch (error: any) {
      showAlert("Could not update photo", error.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showAlert(
        "Permission needed",
        source === "camera"
          ? "Camera access is required to take a profile picture."
          : "Photo library access is required to choose a profile picture.",
      );
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
          });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      showAlert("Could not update photo", "No image was selected.");
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    const avatarUrl = asset.base64
      ? `data:${mimeType};base64,${asset.base64}`
      : asset.uri;

    await saveAvatar(avatarUrl);
  };

  const handleAvatarPress = () => {
    Alert.alert("Update profile picture", undefined, [
      {
        text: "Take Photo",
        onPress: () => {
          void pickAvatar("camera");
        },
      },
      {
        text: "Choose From Library",
        onPress: () => {
          void pickAvatar("library");
        },
      },
      ...(userProfile?.avatar_url
        ? [
            {
              text: "Remove Photo",
              style: "destructive" as const,
              onPress: () => {
                void saveAvatar(null);
              },
            },
          ]
        : []),
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const openModal = (modal: Exclude<ProfileModal, null>) => {
    if (modal === "name") {
      setEditName(displayName);
    }
    if (modal === "email") {
      setEditEmail(email);
    }
    if (modal === "password") {
      setNewPassword("");
      setConfirmPassword("");
    }
    if (modal === "household-name") {
      setEditHouseholdName(household?.name ?? "");
    }
    setActiveModal(modal);
  };

  const closeModal = () => {
    if (!saving) {
      setActiveModal(null);
    }
  };

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((current) =>
      current.includes(allergy)
        ? current.filter((item) => item !== allergy)
        : [...current, allergy]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleLeaveHousehold = () => {
    if (!session?.user.id || !household?.id) {
      showAlert("No household", "Join or create a household first.");
      return;
    }

    Alert.alert(
      "Leave household?",
      "This will delete all items you added to this household and remove you from it.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);

              const { error: deleteItemsError } = await supabase
                .from("food_items")
                .delete()
                .eq("household_id", household.id)
                .eq("added_by", session.user.id);

              if (deleteItemsError) {
                throw deleteItemsError;
              }

              const { error: leaveError } = await supabase
                .from("household_members")
                .delete()
                .eq("user_id", session.user.id);

              if (leaveError) {
                throw leaveError;
              }

              const { count: remainingMemberships, error: verifyLeaveError } = await supabase
                .from("household_members")
                .select("id", { count: "exact", head: true })
                .eq("user_id", session.user.id)
                .limit(1);

              if (verifyLeaveError) {
                throw verifyLeaveError;
              }

              if ((remainingMemberships ?? 0) > 0) {
                throw new Error(
                  "Your household membership still exists in the database. This usually means the live Supabase delete policy has not been applied yet.",
                );
              }

              await refresh();
              router.replace("/setup");
            } catch (error: any) {
              showAlert(
                "Could not leave household",
                error.message ?? "Please try again after updating your database policies.",
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleCopyHouseholdCode = async () => {
    if (!household?.invite_code) {
      showAlert("No code", "There is no household code to copy.");
      return;
    }

    try {
      await Clipboard.setStringAsync(household.invite_code);
      showAlert("Copied", "Household code copied to clipboard.");
    } catch (error: any) {
      showAlert("Could not copy", error.message ?? "Please try again.");
    }
  };

  const handleSaveName = async () => {
    if (!session?.user.id) {
      showAlert("Error", "You need to be signed in to update your name.");
      return;
    }

    const nextName = editName.trim();
    if (!nextName) {
      showAlert("Missing name", "Enter the name you want to use.");
      return;
    }

    try {
      setSaving(true);

      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: nextName },
      });

      if (authError) {
        throw authError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: nextName })
        .eq("id", session.user.id);

      if (profileError) {
        throw profileError;
      }

      await refresh();
      setActiveModal(null);
      showAlert("Name updated", "Your profile name has been updated.");
    } catch (error: any) {
      showAlert("Could not update name", error.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    const nextEmail = editEmail.trim().toLowerCase();

    if (!nextEmail) {
      showAlert("Missing email", "Enter the new email address you want to use.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({ email: nextEmail });

      if (error) {
        throw error;
      }

      setActiveModal(null);
      showAlert(
        "Check your email",
        "Supabase may send a confirmation link before the change takes effect."
      );
    } catch (error: any) {
      showAlert("Could not update email", error.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      showAlert("Password too short", "Use at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Passwords do not match", "Enter the same password in both fields.");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw error;
      }

      setActiveModal(null);
      setNewPassword("");
      setConfirmPassword("");
      showAlert("Password updated", "Your password has been changed.");
    } catch (error: any) {
      showAlert("Could not update password", error.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHouseholdName = async () => {
    if (!household?.id) {
      showAlert("No household", "Join or create a household first.");
      return;
    }

    const nextName = editHouseholdName.trim();
    if (!nextName) {
      showAlert("Missing household name", "Enter a name for your household.");
      return;
    }

    try {
      setSaving(true);

      const { data: updatedHousehold, error } = await supabase
        .from("households")
        .update({ name: nextName })
        .eq("id", household.id)
        .select("id, name, invite_code, created_at")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!updatedHousehold || updatedHousehold.name !== nextName) {
        throw new Error(
          "The household name did not persist. Check your Supabase update policy for households.",
        );
      }

      setHouseholdState(updatedHousehold);
      setActiveModal(null);
      showAlert("Household updated", "Your household name has been changed.");
    } catch (error: any) {
      showAlert(
        "Could not rename household",
        error.message ?? "Please try again after updating your database policies."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderModalBody = () => {
    switch (activeModal) {
      case "name":
        return (
          <>
            <Text style={styles.modalTitle}>Edit name</Text>
            <Text style={styles.modalIntro}>
              Update the name your roommates see around the app.
            </Text>
            <Input
              placeholder="Your name"
              autoCapitalize="words"
              value={editName}
              onChangeText={setEditName}
            />
            <Button
              title={saving ? "Saving..." : "Save name"}
              onPress={handleSaveName}
              disabled={saving}
              style={styles.modalDoneButton}
            />
          </>
        );
      case "email":
        return (
          <>
            <Text style={styles.modalTitle}>Change email</Text>
            <Text style={styles.modalIntro}>
              This updates the email tied to your sign-in account.
            </Text>
            <Input
              placeholder="New email"
              keyboardType="email-address"
              value={editEmail}
              onChangeText={setEditEmail}
            />
            <Button
              title={saving ? "Saving..." : "Save email"}
              onPress={handleSaveEmail}
              disabled={saving}
              style={styles.modalDoneButton}
            />
          </>
        );
      case "password":
        return (
          <>
            <Text style={styles.modalTitle}>Change password</Text>
            <Text style={styles.modalIntro}>
              Choose a new password for your account.
            </Text>
            <Input
              placeholder="New password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <View style={styles.inputGap} />
            <Input
              placeholder="Confirm new password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Button
              title={saving ? "Saving..." : "Save password"}
              onPress={handleSavePassword}
              disabled={saving}
              style={styles.modalDoneButton}
            />
          </>
        );
      case "allergies":
        return (
          <>
            <Text style={styles.modalTitle}>Allergies</Text>
            <Text style={styles.modalIntro}>
              Pick any common allergies that apply. Add anything else below.
            </Text>
            <View style={styles.allergyGrid}>
              {COMMON_ALLERGIES.map((allergy) => {
                const active = selectedAllergies.includes(allergy);

                return (
                  <Pressable
                    key={allergy}
                    style={[styles.allergyChip, active && styles.allergyChipActive]}
                    onPress={() => toggleAllergy(allergy)}
                  >
                    <Text style={[styles.allergyChipText, active && styles.allergyChipTextActive]}>
                      {allergy}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.otherLabel}>Other</Text>
            <Input
              placeholder="Add another allergy"
              autoCapitalize="words"
              value={otherAllergy}
              onChangeText={setOtherAllergy}
            />
            <Button title="Done" onPress={closeModal} style={styles.modalDoneButton} />
          </>
        );
      case "members":
        return (
          <>
            <Text style={styles.modalTitle}>Household members</Text>
            <Text style={styles.modalIntro}>
              Everyone currently connected to {household?.name ?? "your household"}.
            </Text>
            <View style={styles.memberList}>
              {members.map((member) => {
                const isCurrentUser = member.user_id === session?.user.id;

                return (
                  <View key={member.id} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Ionicons name="person" size={18} color={AppTheme.colors.accentDark} />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.profiles?.display_name ?? "Household member"}
                        {isCurrentUser ? " (You)" : ""}
                      </Text>
                      <Text style={styles.memberMeta}>
                        {member.role === "owner" ? "Owner" : "Member"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.roleBadge,
                        member.role === "owner" ? styles.ownerBadge : styles.memberBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          member.role === "owner"
                            ? styles.ownerBadgeText
                            : styles.memberBadgeText,
                        ]}
                      >
                        {member.role === "owner" ? "Admin" : "Member"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <Button title="Done" onPress={closeModal} style={styles.modalDoneButton} />
          </>
        );
      case "household-name":
        return (
          <>
            <Text style={styles.modalTitle}>Rename household</Text>
            <Text style={styles.modalIntro}>
              Give your shared space a name that everyone will recognize.
            </Text>
            <Input
              placeholder="Household name"
              autoCapitalize="words"
              value={editHouseholdName}
              onChangeText={setEditHouseholdName}
            />
            <Button
              title={saving ? "Saving..." : "Save household name"}
              onPress={handleSaveHouseholdName}
              disabled={saving}
              style={styles.modalDoneButton}
            />
          </>
        );
      case "household-code":
        return (
          <>
            <Text style={styles.modalTitle}>Household code</Text>
            <Text style={styles.modalIntro}>
              Share this code with roommates so they can join the same CoPantry.
            </Text>
            <View style={styles.codeCard}>
              <Text style={styles.codeValue}>
                {(household?.invite_code ?? "--------").split("").join(" ")}
              </Text>
            </View>
            <Button
              title="Copy code"
              onPress={handleCopyHouseholdCode}
              style={styles.modalDoneButton}
            />
            <Button title="Done" onPress={closeModal} style={styles.modalDoneButton} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarWrap}>
          <Pressable
            style={styles.avatarButton}
            onPress={handleAvatarPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Update profile photo"
            accessibilityHint="Opens options to take a photo or choose one from your library"
          >
            <View style={styles.avatar}>
              {userProfile?.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={48} color={AppTheme.colors.muted} />
              )}
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name="camera-outline" size={16} color={AppTheme.colors.text} />
            </View>
          </Pressable>
          <Pressable onPress={handleAvatarPress} hitSlop={8}>
            <Text style={styles.avatarHelper}>
              {userProfile?.avatar_url ? "Tap photo to change it" : "Tap photo to add one"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Account</Text>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow} onPress={() => openModal("name")}>
            <Text style={styles.cardRowText}>Edit name</Text>
            <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow} onPress={() => openModal("email")}>
            <Text style={styles.cardRowText}>Change email</Text>
            <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow} onPress={() => openModal("password")}>
            <Text style={styles.cardRowText}>Change password</Text>
            <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Household</Text>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow} onPress={() => openModal("members")}>
            <Text style={styles.cardRowText}>Manage household members</Text>
            <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow} onPress={() => openModal("household-name")}>
            <View style={styles.cardRowContent}>
              <Text style={styles.cardRowText}>Rename household</Text>
              <Text style={styles.cardRowSubtext}>{household?.name ?? "No household yet"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
          </Pressable>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow} onPress={() => openModal("household-code")}>
            <View style={styles.cardRowContent}>
              <Text style={styles.cardRowText}>See household code</Text>
              <Text style={styles.cardRowSubtext}>
                {household?.invite_code ? household.invite_code.split("").join(" ") : "Unavailable"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
          </Pressable>
          <View style={styles.divider} />

          <Pressable
            style={styles.cardRow}
            onPress={handleLeaveHousehold}
            disabled={saving}
          >
            <Text style={styles.leaveRowText}>
              {saving ? "Leaving household..." : "Leave household"}
            </Text>
            <Ionicons name="exit-outline" size={18} color={AppTheme.colors.red} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Dietary Preferences</Text>
          <View style={styles.divider} />

          <Pressable style={styles.cardRow} onPress={() => openModal("allergies")}>
            <View style={styles.cardRowContent}>
              <Text style={styles.cardRowText}>Allergies</Text>
              <Text style={styles.cardRowSubtext}>
                {allergySummary.length ? allergySummary.join(", ") : "Add allergies"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.muted} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardRowText}>Push notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: AppTheme.colors.surfaceAlt, true: AppTheme.colors.green }}
              thumbColor="white"
            />
          </View>
        </View>

        <View style={styles.footerCard}>
          <Ionicons name="home-outline" size={18} color={AppTheme.colors.accentDark} />
          <Text style={styles.footerText}>
            {myMember?.role === "owner"
              ? "You can keep your household details up to date here."
              : "You can view household details and keep your account information current here."}
          </Text>
        </View>

        <Button
          variant="pill"
          title="Log out"
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>

      <Modal
        visible={!!activeModal}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeader}>
                  <Pressable onPress={closeModal} style={styles.closeButton}>
                    <Ionicons name="close" size={18} color={AppTheme.colors.text} />
                  </Pressable>
                </View>
                {renderModalBody()}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.page },
  scroll: { paddingTop: 60, paddingHorizontal: 28, paddingBottom: 40 },
  avatarWrap: { alignItems: "center", marginBottom: 12 },
  avatarButton: {
    position: "relative",
  },
  avatarHelper: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.accentDark,
    textAlign: "center",
  },
  avatar: {
    width: 93,
    height: 93,
    borderRadius: 47,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.cardLavender,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 32,
    fontWeight: "800",
    fontFamily: Fonts.sans,
    textAlign: "center",
    color: AppTheme.colors.text,
  },
  email: {
    fontSize: 18,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadow.card,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: AppTheme.colors.accentSoft,
    marginHorizontal: 18,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  cardRowContent: {
    flex: 1,
    paddingRight: 12,
  },
  cardRowText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  leaveRowText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.red,
  },
  cardRowSubtext: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.muted,
  },
  footerCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.line,
    padding: 16,
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.muted,
  },
  logoutBtn: { marginTop: 20 },
  modalKeyboardWrap: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 42, 68, 0.35)",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    padding: 20,
    maxHeight: "85%",
    ...AppTheme.shadow.floating,
  },
  modalScrollContent: {
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  modalIntro: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: AppTheme.colors.muted,
    marginTop: 8,
    marginBottom: 16,
  },
  inputGap: {
    height: 12,
  },
  allergyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  allergyChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.surfaceAlt,
  },
  allergyChipActive: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderColor: AppTheme.colors.accentDark,
  },
  allergyChipText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  allergyChipTextActive: {
    color: AppTheme.colors.accentDark,
  },
  otherLabel: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
    marginBottom: 8,
  },
  memberList: {
    gap: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: AppTheme.colors.line,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accentSoft,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.text,
  },
  memberMeta: {
    fontSize: 13,
    marginTop: 4,
    color: AppTheme.colors.muted,
    fontFamily: Fonts.sans,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
  },
  ownerBadge: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderColor: AppTheme.colors.accentDark,
  },
  memberBadge: {
    backgroundColor: AppTheme.colors.greenSoft,
    borderColor: AppTheme.colors.green,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Fonts.sans,
  },
  ownerBadgeText: {
    color: AppTheme.colors.accentDark,
  },
  memberBadgeText: {
    color: AppTheme.colors.green,
  },
  codeCard: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.lineStrong,
    backgroundColor: AppTheme.colors.accentSoft,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  codeValue: {
    fontSize: 24,
    letterSpacing: 6,
    fontWeight: "800",
    fontFamily: Fonts.sans,
    color: AppTheme.colors.accentDark,
  },
  modalDoneButton: {
    marginTop: 16,
  },
});
