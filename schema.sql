-- Link Playlist Saver Schema
-- This schema is designed to be generally compatible with PostgreSQL and MySQL.

--
-- Table structure for table `playlists`
--

CREATE TABLE playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  display_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--
-- Table structure for table `links`
--

CREATE TABLE links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id INT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  display_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Add the "Recycle Bin" as a permanent, non-deletable playlist
-- You would run this command once after creating the tables.
INSERT INTO playlists (name, display_order) VALUES ('Recycle Bin', 999999);