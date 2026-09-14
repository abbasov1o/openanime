import SwiftUI

/// Sign-in sheet for anizium.co accounts. Anizium authenticates with a nick or
/// e-mail plus password (no OAuth web sheet), so the form is presented here and
/// handed to `AniziumAuthManager`; on success the account's profiles are offered
/// when there is more than one to choose from.
struct AniziumLoginView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AniziumAuthManager.shared

    @State private var identifier = ""
    @State private var password = ""
    @State private var isRegistering = false
    @State private var nick = ""
    @State private var email = ""
    @State private var name = ""
    @State private var surname = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var canSubmit: Bool {
        if isRegistering {
            return !nick.trimmingCharacters(in: .whitespaces).isEmpty
                && !email.trimmingCharacters(in: .whitespaces).isEmpty
                && password.count >= 6
        }
        return !identifier.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty
    }

    var body: some View {
        NavigationStack {
            Group {
                if auth.isLoggedIn {
                    signedInContent
                } else {
                    form
                }
            }
            .navigationTitle("Anizium")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    // MARK: - Signed in

    /// After a successful sign-in: pick a profile when the account has several,
    /// otherwise just confirm and close.
    private var signedInContent: some View {
        List {
            Section {
                HStack(spacing: 12) {
                    CachedAsyncImage(urlString: selectedAvatarURL ?? "")
                        .frame(width: 44, height: 44)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(auth.user?.nick ?? "Anizium")
                            .font(.headline)
                        Text(auth.isPremium ? "Premium" : "Free account")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if auth.profiles.count > 1 {
                Section("Profile") {
                    ForEach(auth.profiles) { profile in
                        Button {
                            auth.selectProfile(profile.ID)
                        } label: {
                            HStack {
                                CachedAsyncImage(urlString: profile.avatarLink ?? "")
                                    .frame(width: 28, height: 28)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                                Text(profile.name ?? profile.ID)
                                Spacer()
                                if auth.selectedProfileID == profile.ID {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Color.accentColor)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            Section {
                Button("Sign Out", role: .destructive) {
                    auth.logout()
                    errorMessage = nil
                }
            }
        }
    }

    private var selectedAvatarURL: String? {
        auth.profiles.first { $0.ID == auth.selectedProfileID }?.avatarLink
            ?? auth.profiles.first?.avatarLink
    }

    // MARK: - Form

    private var form: some View {
        Form {
            if isRegistering {
                Section("Create an Anizium account") {
                    TextField("Nickname", text: $nick)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        #endif
                    TextField("E-mail", text: $email)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        #endif
                    SecureField("Password (min 6 characters)", text: $password)
                    TextField("Name (optional)", text: $name)
                    TextField("Surname (optional)", text: $surname)
                }
            } else {
                Section("Sign in to Anizium") {
                    TextField("Nickname or e-mail", text: $identifier)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        #endif
                    SecureField("Password", text: $password)
                }
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }

            Section {
                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        Spacer()
                        if isLoading {
                            ProgressView()
                        } else {
                            Text(isRegistering ? "Create Account" : "Sign In")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(!canSubmit || isLoading)

                Button(isRegistering ? "I already have an account" : "Create a new account") {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        isRegistering.toggle()
                        errorMessage = nil
                    }
                }
                .font(.subheadline)
                .foregroundStyle(Color.accentColor)
                .frame(maxWidth: .infinity)
            }
            .disabled(isLoading)
        }
    }

    // MARK: - Actions

    private func submit() async {
        isLoading = true
        errorMessage = nil
        do {
            if isRegistering {
                try await auth.register(
                    nick: nick.trimmingCharacters(in: .whitespaces),
                    name: name.isEmpty ? nil : name,
                    surname: surname.isEmpty ? nil : surname,
                    email: email.trimmingCharacters(in: .whitespaces),
                    phone: nil,
                    password: password
                )
                // Registration answers with the new account; sign in right away,
                // exactly as the site's own second step would.
                try await auth.login(value: nick.trimmingCharacters(in: .whitespaces),
                                     password: password)
            } else {
                try await auth.login(value: identifier.trimmingCharacters(in: .whitespaces),
                                     password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

