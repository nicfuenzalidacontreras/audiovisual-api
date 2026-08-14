-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(180) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `role` ENUM('ADMIN', 'PHOTOGRAPHER', 'ASSISTANT') NOT NULL DEFAULT 'PHOTOGRAPHER',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `rut` VARCHAR(12) NULL,
    `email` VARCHAR(180) NULL,
    `phone` VARCHAR(30) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `clients_rut_key`(`rut`),
    INDEX `clients_name_idx`(`name`),
    INDEX `clients_email_idx`(`email`),
    INDEX `clients_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NULL,
    `name` VARCHAR(180) NOT NULL,
    `type` ENUM('WEDDING', 'SESSION', 'EVENT', 'CORPORATE', 'PRODUCT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `status` ENUM('PROSPECT', 'CONFIRMED', 'EDITING', 'DELIVERED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'PROSPECT',
    `event_date` DATE NULL,
    `venue` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `allows_publishing` BOOLEAN NOT NULL DEFAULT false,
    `allows_minors` BOOLEAN NOT NULL DEFAULT false,
    `consent_granted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `projects_client_id_status_idx`(`client_id`, `status`),
    INDEX `projects_event_date_idx`(`event_date`),
    INDEX `projects_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotes` (
    `id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NULL,
    `user_id` CHAR(36) NULL,
    `year` INTEGER NOT NULL,
    `number` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 19.00,
    `tax` DECIMAL(14, 2) NOT NULL,
    `discount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'CLP',
    `valid_until` DATE NULL,
    `terms` TEXT NULL,
    `internal_notes` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `responded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `quotes_client_id_status_idx`(`client_id`, `status`),
    INDEX `quotes_status_valid_until_idx`(`status`, `valid_until`),
    UNIQUE INDEX `quotes_year_number_key`(`year`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_items` (
    `id` CHAR(36) NOT NULL,
    `quote_id` CHAR(36) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(255) NOT NULL,
    `details` TEXT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `line_total` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quote_items_quote_id_position_idx`(`quote_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `type` ENUM('PHOTO', 'VIDEO') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `original_filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `key_original` VARCHAR(500) NOT NULL,
    `key_thumb` VARCHAR(500) NULL,
    `key_preview` VARCHAR(500) NULL,
    `key_poster` VARCHAR(500) NULL,
    `size_bytes` BIGINT NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `duration_seconds` INTEGER NULL,
    `checksum` VARCHAR(64) NULL,
    `external_video_id` VARCHAR(120) NULL,
    `captured_at` DATETIME(3) NULL,
    `process_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `processed_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `assets_project_id_status_idx`(`project_id`, `status`),
    INDEX `assets_status_created_at_idx`(`status`, `created_at`),
    INDEX `assets_checksum_idx`(`checksum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `galleries` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `slug` VARCHAR(24) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `welcome_message` TEXT NULL,
    `cover_asset_id` CHAR(36) NULL,
    `password_hash` VARCHAR(255) NULL,
    `allows_selections` BOOLEAN NOT NULL DEFAULT true,
    `allows_zip` BOOLEAN NOT NULL DEFAULT true,
    `selection_limit` INTEGER NULL,
    `published_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `galleries_slug_key`(`slug`),
    INDEX `galleries_project_id_idx`(`project_id`),
    INDEX `galleries_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_assets` (
    `gallery_id` CHAR(36) NOT NULL,
    `asset_id` CHAR(36) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `gallery_assets_gallery_id_position_idx`(`gallery_id`, `position`),
    INDEX `gallery_assets_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`gallery_id`, `asset_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_tokens` (
    `id` CHAR(36) NOT NULL,
    `gallery_id` CHAR(36) NOT NULL,
    `token` VARCHAR(48) NOT NULL,
    `type` ENUM('PRIMARY', 'PUBLIC') NOT NULL DEFAULT 'PRIMARY',
    `label` VARCHAR(80) NULL,
    `allows_original_download` BOOLEAN NOT NULL DEFAULT false,
    `allows_selections` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NULL,
    `is_revoked` BOOLEAN NOT NULL DEFAULT false,
    `max_uses` INTEGER NULL,
    `uses` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `gallery_tokens_token_key`(`token`),
    INDEX `gallery_tokens_gallery_id_type_idx`(`gallery_id`, `type`),
    INDEX `gallery_tokens_is_revoked_expires_at_idx`(`is_revoked`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `selections` (
    `id` CHAR(36) NOT NULL,
    `token_id` CHAR(36) NOT NULL,
    `asset_id` CHAR(36) NOT NULL,
    `type` ENUM('FAVORITE', 'REJECTED') NOT NULL DEFAULT 'FAVORITE',
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `selections_asset_id_type_idx`(`asset_id`, `type`),
    UNIQUE INDEX `selections_token_id_asset_id_key`(`token_id`, `asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_sessions` (
    `id` CHAR(36) NOT NULL,
    `gallery_id` CHAR(36) NOT NULL,
    `token_id` CHAR(36) NULL,
    `visitor_id` VARCHAR(40) NOT NULL,
    `ip_hash` VARCHAR(64) NULL,
    `user_agent` VARCHAR(400) NULL,
    `referer` VARCHAR(400) NULL,
    `country` VARCHAR(2) NULL,
    `is_mobile` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity_at` DATETIME(3) NOT NULL,

    INDEX `gallery_sessions_gallery_id_created_at_idx`(`gallery_id`, `created_at`),
    INDEX `gallery_sessions_gallery_id_visitor_id_idx`(`gallery_id`, `visitor_id`),
    INDEX `gallery_sessions_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `session_id` CHAR(36) NOT NULL,
    `type` ENUM('PHOTO_VIEW', 'VIDEO_PLAY', 'ZIP_REQUESTED', 'SHARED') NOT NULL,
    `asset_id` CHAR(36) NULL,
    `duration_ms` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `gallery_events_session_id_idx`(`session_id`),
    INDEX `gallery_events_asset_id_type_idx`(`asset_id`, `type`),
    INDEX `gallery_events_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `downloads` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `gallery_id` CHAR(36) NOT NULL,
    `token_id` CHAR(36) NULL,
    `asset_id` CHAR(36) NULL,
    `type` ENUM('ORIGINAL', 'PREVIEW', 'ZIP') NOT NULL,
    `ip_hash` VARCHAR(64) NULL,
    `user_agent` VARCHAR(400) NULL,
    `bytes` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `downloads_gallery_id_created_at_idx`(`gallery_id`, `created_at`),
    INDEX `downloads_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_stats` (
    `gallery_id` CHAR(36) NOT NULL,
    `unique_visitors` INTEGER NOT NULL DEFAULT 0,
    `total_sessions` INTEGER NOT NULL DEFAULT 0,
    `photo_views` INTEGER NOT NULL DEFAULT 0,
    `original_downloads` INTEGER NOT NULL DEFAULT 0,
    `zip_downloads` INTEGER NOT NULL DEFAULT 0,
    `total_selections` INTEGER NOT NULL DEFAULT 0,
    `client_first_opened_at` DATETIME(3) NULL,
    `last_opened_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`gallery_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pending_uploads` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `upload_id` VARCHAR(255) NOT NULL,
    `key` VARCHAR(500) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `size_bytes` BIGINT NOT NULL,
    `total_parts` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `pending_uploads_created_at_idx`(`created_at`),
    UNIQUE INDEX `pending_uploads_upload_id_key_key`(`upload_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `galleries` ADD CONSTRAINT `galleries_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_assets` ADD CONSTRAINT `gallery_assets_gallery_id_fkey` FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_assets` ADD CONSTRAINT `gallery_assets_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_tokens` ADD CONSTRAINT `gallery_tokens_gallery_id_fkey` FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selections` ADD CONSTRAINT `selections_token_id_fkey` FOREIGN KEY (`token_id`) REFERENCES `gallery_tokens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `selections` ADD CONSTRAINT `selections_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_sessions` ADD CONSTRAINT `gallery_sessions_gallery_id_fkey` FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_sessions` ADD CONSTRAINT `gallery_sessions_token_id_fkey` FOREIGN KEY (`token_id`) REFERENCES `gallery_tokens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_events` ADD CONSTRAINT `gallery_events_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `gallery_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_events` ADD CONSTRAINT `gallery_events_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_gallery_id_fkey` FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_token_id_fkey` FOREIGN KEY (`token_id`) REFERENCES `gallery_tokens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_stats` ADD CONSTRAINT `gallery_stats_gallery_id_fkey` FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pending_uploads` ADD CONSTRAINT `pending_uploads_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
