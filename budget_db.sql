-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 22, 2026 at 03:45 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `budget_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

CREATE TABLE `bills` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `due_date` date NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `paid` tinyint(1) DEFAULT 0,
  `paid_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bills`
--

INSERT INTO `bills` (`id`, `name`, `amount`, `due_date`, `category`, `paid`, `paid_date`) VALUES
(3, 'Internet', 1200.00, '2026-03-30', 'Internet', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `expiry_date` date NOT NULL,
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `title`, `type`, `expiry_date`, `notes`) VALUES
(1, 'Pasport', 'Paspor', '2030-12-22', 'Perpanjang paspor'),
(2, 'Kontrak', 'Kontrak Kerja', '2026-04-30', 'Habis kontrak'),
(3, 'Asuransi', 'Asuransi', '2026-03-25', ''),
(4, 'Pasport', 'Zairyu Card', '2026-03-17', 'S');

-- --------------------------------------------------------

--
-- Table structure for table `goals`
--

CREATE TABLE `goals` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `target` decimal(15,2) NOT NULL,
  `saved` decimal(15,2) DEFAULT 0.00,
  `deadline` varchar(100) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `goals`
--

INSERT INTO `goals` (`id`, `name`, `target`, `saved`, `deadline`, `color`, `icon`) VALUES
(4, 'Macbook Air', 30000.00, 25000.00, '2026-12', 'amber', 'laptop'),
(5, 'JLPT N3', 2300.00, 650.00, '2026-12', 'cyan', 'trophy'),
(7, 'iPhone', 240000.00, 40000.00, '2027-03', 'purple', 'trophy'),
(8, 'Umrah', 300000.00, 20000.00, '', 'lime', 'star');

-- --------------------------------------------------------

--
-- Table structure for table `nenkin`
--

CREATE TABLE `nenkin` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `avg_salary` decimal(15,2) NOT NULL,
  `months` int(11) NOT NULL,
  `estimated_amount` decimal(15,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `nenkin`
--

INSERT INTO `nenkin` (`id`, `date`, `avg_salary`, `months`, `estimated_amount`, `notes`) VALUES
(1, '2026-03-19', 18094.00, 24, 28798.00, 'Des 2028');

-- --------------------------------------------------------

--
-- Table structure for table `remittances`
--

CREATE TABLE `remittances` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `amount_jpy` decimal(15,2) NOT NULL,
  `exchange_rate` decimal(10,2) NOT NULL,
  `amount_idr` decimal(15,2) NOT NULL,
  `provider` varchar(50) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `remittances`
--

INSERT INTO `remittances` (`id`, `date`, `amount_jpy`, `exchange_rate`, `amount_idr`, `provider`, `notes`) VALUES
(1, '2026-03-18', 5300.00, 106.43, 564079.00, 'Lainnya', 'Kirim Ortu');

-- --------------------------------------------------------

--
-- Table structure for table `shifts`
--

CREATE TABLE `shifts` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `start_time` varchar(20) DEFAULT NULL,
  `end_time` varchar(20) DEFAULT NULL,
  `hours` decimal(5,2) DEFAULT NULL,
  `normal_hours` decimal(5,2) DEFAULT NULL,
  `overtime_hours` decimal(5,2) DEFAULT NULL,
  `hourly_rate` decimal(15,2) DEFAULT NULL,
  `earnings` decimal(15,2) DEFAULT NULL,
  `recorded` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shifts`
--

INSERT INTO `shifts` (`id`, `date`, `type`, `start_time`, `end_time`, `hours`, `normal_hours`, `overtime_hours`, `hourly_rate`, `earnings`, `recorded`) VALUES
(6, '2026-03-18', 'Morning', '08:00', '16:00', 8.00, 8.00, 0.00, 1039.00, 8312.00, 1),
(7, '2026-03-17', 'Morning', '08:00', '18:00', 10.00, 8.00, 2.00, 1039.00, 10390.00, 1),
(10, '2026-03-13', 'Afternoon', '13:00', '23:00', 10.00, 8.00, 2.00, 1039.00, 10390.00, 1),
(13, '2026-03-15', 'OffDay', '00:00', '00:00', 0.00, 0.00, 0.00, 0.00, 0.00, 1),
(14, '2026-03-14', 'OffDay', '00:00', '00:00', 0.00, 0.00, 0.00, 0.00, 0.00, 1),
(15, '2026-03-12', 'Afternoon', '13:00', '21:00', 8.00, 8.00, 0.00, 1039.00, 8312.00, 1),
(16, '2026-03-11', 'Morning', '08:00', '16:00', 8.00, 8.00, 0.00, 1039.00, 8312.00, 1),
(17, '2026-03-10', 'Full', '08:00', '20:00', 12.00, 12.00, 0.00, 1039.00, 12468.00, 1),
(18, '2026-03-09', 'Lembur', '17:00', '21:00', 4.00, 0.00, 4.00, 1039.00, 6236.00, 1),
(19, '2026-03-08', 'OffDay', '00:00', '00:00', 0.00, 0.00, 0.00, 0.00, 0.00, 1),
(20, '2026-03-16', 'Morning', '08:00', '16:00', 8.00, 8.00, 0.00, 1039.00, 8312.00, 1),
(21, '2026-03-07', 'OffDay', '00:00', '00:00', 0.00, 0.00, 0.00, 0.00, 0.00, 1),
(22, '2026-03-06', 'Morning', '08:00', '16:00', 8.00, 8.00, 0.00, 1039.00, 8312.00, 1),
(23, '2026-03-19', 'Night', '20:00', '04:00', 8.00, 8.00, 0.00, 1039.00, 8312.00, 1),
(24, '2026-03-05', 'Afternoon', '13:00', '21:00', 8.00, 8.00, 0.00, 1039.00, 8312.00, 0),
(25, '2026-03-22', 'OffDay', '00:00', '00:00', 0.00, 0.00, 0.00, 0.00, 0.00, 0),
(26, '2026-03-21', 'OffDay', '00:00', '00:00', 0.00, 0.00, 0.00, 0.00, 0.00, 0),
(27, '2026-03-20', 'OffDay', '00:00', '00:00', 0.00, 0.00, 0.00, 0.00, 0.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `due_date` date DEFAULT NULL,
  `priority` varchar(20) DEFAULT 'medium',
  `tag` varchar(50) DEFAULT 'Lainnya'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `status`, `due_date`, `priority`, `tag`) VALUES
(3, 'Belajar Bunpou', 'progress', NULL, 'medium', 'Lainnya'),
(5, 'Belajar N3', 'progress', '2026-03-23', 'high', 'Lainnya'),
(6, 'Web App', 'pending', '2026-03-31', 'medium', 'Lainnya'),
(7, 'Belajar N3', 'completed', '2026-03-31', 'low', 'Pribadi');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `category` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `type`, `amount`, `category`, `date`, `description`, `created_at`) VALUES
(9, 'income', 180000.00, 'Gaji', '2026-02-16', 'Gaji', '2026-03-08 03:36:20'),
(10, 'income', 8312.00, 'Gaji', '2026-03-08', 'Pendapatan Shift Kerja', '2026-03-08 06:02:05'),
(11, 'expense', 230.00, 'Makanan & Minuman', '2026-03-08', 'Makan Siang', '2026-03-08 06:02:54'),
(12, 'income', 8312.00, 'Gaji', '2026-03-18', 'Pendapatan Shift Kerja', '2026-03-18 14:00:33'),
(13, 'income', 10390.00, 'Gaji', '2026-03-18', 'Pendapatan Shift Kerja', '2026-03-18 14:16:03'),
(15, 'income', 4695.00, 'Freelance', '2026-03-15', 'Freelance', '2026-03-18 14:53:00'),
(16, 'expense', 2028.00, 'Tagihan', '2026-03-17', 'BPJS Ketenagakerjaan', '2026-03-18 15:15:23'),
(17, 'expense', 253.00, 'Makanan & Minuman', '2026-03-17', 'Kirim Paket', '2026-03-18 15:16:00'),
(18, 'income', 10390.00, 'Gaji', '2026-03-18', 'Pendapatan Shift Kerja', '2026-03-18 15:16:24'),
(19, 'income', 43640.00, 'Gaji', '2026-03-18', 'Pendapatan Shift Kerja', '2026-03-18 15:35:56'),
(20, 'income', 8312.00, 'Gaji', '2026-03-18', 'Pendapatan Shift Kerja', '2026-03-18 15:54:36'),
(21, 'expense', 200.00, 'Pulsa & Paket Data', '2026-03-19', 'Pulsa', '2026-03-19 05:39:03'),
(22, 'expense', 2000.00, 'Pulsa & Paket Data', '2026-03-17', 'Paket Data', '2026-03-19 05:46:16'),
(23, 'income', 8312.00, 'Gaji', '2026-03-19', 'Pendapatan Shift Kerja', '2026-03-19 06:23:33'),
(24, 'income', 2000.00, 'Hasil Usaha', '2026-03-19', 'Freelance', '2026-03-19 06:37:36'),
(27, 'expense', 230.00, 'Belanja', '2026-03-20', 'Pengeluaran Belanja', '2026-03-20 05:21:53'),
(31, 'income', 1000.00, 'Lainnya', '2026-03-20', 'Terima piutang dari Indra', '2026-03-20 07:58:29');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `photo` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `photo`) VALUES
('mmdm5j35vwynqhxi1lb', 'Noe Je', 'esportsid45@gmail.com', 'pd42a6', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `goals`
--
ALTER TABLE `goals`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `nenkin`
--
ALTER TABLE `nenkin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `remittances`
--
ALTER TABLE `remittances`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shifts`
--
ALTER TABLE `shifts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `goals`
--
ALTER TABLE `goals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `nenkin`
--
ALTER TABLE `nenkin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `remittances`
--
ALTER TABLE `remittances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `shifts`
--
ALTER TABLE `shifts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
