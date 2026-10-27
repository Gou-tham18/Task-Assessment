"""Tests for ticket_summary.py using pytest.

Checks:
- Category counts.
- Average resolution duration.
- Unresolved tickets excluded from average.
- Empty CSV files.
- Invalid timestamps.
- Rows with extra fields.
- UTF-8 BOM handling.
- Alternative timestamp formats.
"""

from ticket_summary import parse_timestamp, process_tickets_file


def test_category_counts(tmp_path):
    """Check that tickets are correctly counted by category."""
    csv_file = tmp_path / "test_categories.csv"
    csv_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n"
        "T-1,2026-03-01 10:00,2026-03-01 12:00,Billing,normal,resolved\n"
        "T-2,2026-03-01 10:00,2026-03-01 13:00,Technical,high,resolved\n"
        "T-3,2026-03-01 10:00,2026-03-01 14:00,Billing,low,resolved\n"
        "T-4,2026-03-01 10:00,2026-03-01 15:00,Shipping,normal,resolved\n",
        encoding="utf-8",
    )

    counts, _ = process_tickets_file(str(csv_file))

    assert counts == {
        "Billing": 2,
        "Technical": 1,
        "Shipping": 1,
    }


def test_average_resolution_duration(tmp_path):
    """Check that average resolution duration is calculated correctly in elapsed hours."""
    csv_file = tmp_path / "test_duration.csv"
    csv_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n"
        "T-1,2026-03-01 10:00,2026-03-01 12:00,Technical,normal,resolved\n"  # 2.0 hours
        "T-2,2026-03-01 10:00,2026-03-01 16:00,Technical,normal,resolved\n",  # 6.0 hours
        encoding="utf-8",
    )

    _, avg_hours = process_tickets_file(str(csv_file))

    # (2.0 + 6.0) / 2 = 4.0 hours
    assert avg_hours == 4.0


def test_unresolved_tickets_excluded_from_average(tmp_path):
    """Check that unresolved tickets (empty resolved_at) do not skew the average duration."""
    csv_file = tmp_path / "test_unresolved.csv"
    csv_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n"
        "T-1,2026-03-01 10:00,2026-03-01 15:00,Billing,normal,resolved\n"  # 5.0 hours
        "T-2,2026-03-01 10:00,,Billing,normal,in_progress\n"  # unresolved
        "T-3,2026-03-01 10:00,,Billing,high,open\n",  # unresolved
        encoding="utf-8",
    )

    counts, avg_hours = process_tickets_file(str(csv_file))

    # All 3 tickets are counted in category counts
    assert counts["Billing"] == 3
    # Only the resolved ticket (5.0 hours) is counted in average duration
    assert avg_hours == 5.0


def test_empty_csv_file(tmp_path):
    """Check that an empty CSV file or a header-only CSV is handled safely without crashing."""
    # Completely empty file (0 bytes)
    empty_file = tmp_path / "empty.csv"
    empty_file.write_text("", encoding="utf-8")

    counts, avg_hours = process_tickets_file(str(empty_file))
    assert counts == {}
    assert avg_hours == 0.0

    # File with header only, no ticket rows
    header_only_file = tmp_path / "header_only.csv"
    header_only_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n",
        encoding="utf-8",
    )

    counts, avg_hours = process_tickets_file(str(header_only_file))
    assert counts == {}
    assert avg_hours == 0.0


def test_invalid_timestamps(tmp_path):
    """Check that rows with invalid timestamps are caught and do not crash the program."""
    csv_file = tmp_path / "test_invalid_ts.csv"
    csv_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n"
        "T-1,2026-03-01 10:00,2026-03-01 13:00,Billing,normal,resolved\n"  # valid: 3.0 hours
        "T-2,2026-02-30 10:00,,Refunds,normal,in_progress\n"  # invalid date: Feb 30 does not exist
        "T-3,2026-03-01 10:00,invalid-time,Technical,high,resolved\n",  # invalid resolved_at
        encoding="utf-8",
    )

    counts, avg_hours = process_tickets_file(str(csv_file))

    # Valid ticket T-1 is counted; invalid rows are skipped
    assert counts == {"Billing": 1}
    assert avg_hours == 3.0


def test_rows_with_extra_fields(tmp_path):
    """Check that malformed rows with extra fields are safely skipped and reported."""
    csv_file = tmp_path / "test_extra_fields.csv"
    csv_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n"
        "T-1,2026-03-01 10:00,2026-03-01 12:00,Technical,normal,resolved\n"
        "T-2,2026-03-01 10:00,,Refunds,normal,open,note: extra column\n"  # 7 fields instead of 6
        "T-3,2026-03-01 10:00,2026-03-01 14:00,Technical,normal,resolved\n",
        encoding="utf-8",
    )

    counts, avg_hours = process_tickets_file(str(csv_file))

    # Malformed row T-2 is skipped, only T-1 and T-3 are counted
    assert counts == {"Technical": 2}
    # (2.0 + 4.0) / 2 = 3.0 hours
    assert avg_hours == 3.0


def test_utf8_bom_handling(tmp_path):
    """Check that CSV files starting with a UTF-8 BOM are decoded cleanly."""
    csv_file = tmp_path / "test_bom.csv"
    # Write using utf-8-sig to include the BOM bytes at the start of the file
    csv_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n"
        "T-1,2026-03-01 08:00,2026-03-01 10:00,Billing,normal,resolved\n",
        encoding="utf-8-sig",
    )

    counts, avg_hours = process_tickets_file(str(csv_file))

    assert counts == {"Billing": 1}
    assert avg_hours == 2.0


def test_alternative_timestamp_format(tmp_path):
    """Check that the alternative DD/MM/YYYY HH:MM format found in tickets.csv is parsed."""
    csv_file = tmp_path / "test_alt_format.csv"
    csv_file.write_text(
        "ticket_id,created_at,resolved_at,category,priority,status\n"
        "T-1,02/03/2026 10:00,02/03/2026 14:00,Refunds,low,resolved\n",
        encoding="utf-8",
    )

    counts, avg_hours = process_tickets_file(str(csv_file))

    assert counts == {"Refunds": 1}
    assert avg_hours == 4.0


def test_parse_timestamp_direct():
    """Directly test parse_timestamp helper for both formats and invalid inputs."""
    # Format 1: YYYY-MM-DD HH:MM
    dt1 = parse_timestamp("2026-02-02 08:48")
    assert dt1.year == 2026 and dt1.month == 2 and dt1.day == 2 and dt1.hour == 8 and dt1.minute == 48

    # Format 2: DD/MM/YYYY HH:MM
    dt2 = parse_timestamp("02/03/2026 10:02")
    assert dt2.year == 2026 and dt2.month == 3 and dt2.day == 2 and dt2.hour == 10 and dt2.minute == 2

    # Empty timestamp returns None
    assert parse_timestamp("") is None
    assert parse_timestamp("   ") is None

    # Invalid timestamp raises ValueError
    # pyrefly: ignore[missing-import]
    import pytest
    with pytest.raises(ValueError):
        parse_timestamp("2026-02-30 10:00")
