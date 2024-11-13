-- Create the 'users' table if it doesn't already exist
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Primary key with a default UUID generated by the system
    username TEXT UNIQUE,                                -- Unique username for the user
    email TEXT UNIQUE,                                   -- Unique email address for the user
    password_hash TEXT,                                  -- Hashed password for security
    first_name TEXT,                                     -- First name of the user
    last_name TEXT,                                      -- Last name of the user
    phone TEXT UNIQUE,                                   -- Unique phone number for the user
    is_email_verified BOOLEAN DEFAULT FALSE,             -- Indicates if the email is verified, default is false
    is_phone_verified BOOLEAN DEFAULT FALSE,             -- Indicates if the phone number is verified, default is false
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP       -- Timestamp of when the user user was created, default is current time
);

-- Create the 'tokens' table if it doesn't already exist
CREATE TABLE IF NOT EXISTS tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Primary key with a default UUID
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,  -- Foreign key referencing 'user_id' in the 'users' table, delete token when user is deleted
    token_type TEXT,                                     -- Type of the token (e.g., access token, refresh token)
    expiry_date TIMESTAMP,                               -- Expiration date of the token
    used BOOLEAN DEFAULT FALSE,                          -- Indicates if the token has been used, default is false
    value TEXT                                           -- The actual token value
);

-- Create the 'federated_credentials' table if it doesn't already exist
CREATE TABLE IF NOT EXISTS federated_credentials (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,  -- Foreign key referencing 'user_id' in the 'users' table, delete federated credentials when user is deleted
    provider TEXT,                                             -- Name of the federated identity provider (e.g., Google, Facebook)
    subject TEXT,                                              -- Unique identifier from the provider (e.g., provider's user ID)
    PRIMARY KEY (provider, subject)                            -- Composite primary key to ensure uniqueness across provider and subject
);

-- Profiles Table: Handles public user profile data (visible to other users)
CREATE TABLE IF NOT EXISTS profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID as primary key using gen_random_uuid()
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE, -- Link to the user, unique to ensure 1-to-1 relationship
    gender TEXT, -- Options could be 'male', 'female', 'other', etc.
    age INT,
    sexual_preference TEXT, -- Options could be 'male', 'female', 'both'
    biography TEXT,
    fame_rating INT DEFAULT 0, -- Fame rating of the user
    profile_picture TEXT, -- Path or URL of the profile picture
    location geography(POINT) not null,
    last_online TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last online timestamp for the user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS profiles_geo_index
  on public.profiles
  using GIST (location);


-- User Interests Table: Stores user interests using tags (part of the public profile)
CREATE TABLE IF NOT EXISTS user_interests (
    interest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    interest_tag TEXT
);

-- User Pictures Table: Handles additional pictures uploaded by the user (part of the public profile)
CREATE TABLE IF NOT EXISTS user_pictures (
    picture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    picture_url TEXT
);

-- Visits Table: Stores profile visit history (who visited whom)
CREATE TABLE IF NOT EXISTS visits (
    visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    visited_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches Table: Handles likes between users (previously called 'likes')
CREATE TABLE IF NOT EXISTS likes (
    liker_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    likee_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    is_like BOOLEAN DEFAULT TRUE, -- Indicates if it's a like or dislike
    like_type TEXT DEFAULT 'like', -- Options could be 'like', 'superlike', etc.
    like_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (liker_user_id, likee_user_id) -- Composite primary key to ensure uniqueness
);

-- Blocked Users Table: Handles blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
    block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    blocked_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    block_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Table: Handles chat messages between matched users
CREATE TABLE IF NOT EXISTS chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table: Stores notifications for various user activities
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE, -- Notifications linked to user (not public)
    notification_type TEXT, -- E.g., 'match', 'message', 'visit'
    notification_text TEXT, -- Text of the notification
    from_user_id UUID REFERENCES users(user_id),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Advanced Search Table: This could store user preferences for searches (only visible to the user)
CREATE TABLE IF NOT EXISTS search_preferences (
    search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    age_min INT,
    age_max INT,
    fame_rating_min INT,
    fame_rating_max INT,
    location_radius FLOAT, -- e.g., 50 km radius
    interests_filter TEXT -- Store tags as a string or use a more normalized design
);

-- User Reports Table: Handles user reports for inappropriate behavior
CREATE TABLE IF NOT EXISTS user_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    report_reason TEXT,
    report_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

