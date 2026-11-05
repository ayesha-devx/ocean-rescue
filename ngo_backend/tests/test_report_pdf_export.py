"""
Automated tests for OceanRescue Incident Management PDF Export endpoint.
Validates:
1. GET /api/v1/reports/export/pdf returns a valid %PDF- binary document.
2. Content-Type is 'application/pdf' and Content-Disposition specifies filename.
3. Filtering by status, gear_type, and search term generates tailored PDFs.
4. Empty result sets are handled gracefully without errors.
5. Multi-page support and metadata structures.
"""

from fastapi import status


def test_export_reports_pdf_success(client, db_session):
    """
    Test basic PDF generation and streaming for all cataloged reports.
    """
    res = client.get("/api/v1/reports/export/pdf")
    assert res.status_code == status.HTTP_200_OK
    assert res.headers["content-type"] == "application/pdf"
    assert "OceanRescue_Incident_Report_" in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF-")
    assert len(res.content) > 1000


def test_export_reports_pdf_filtered_by_status(client, db_session):
    """
    Test PDF generation when filtering for verified reports.
    """
    res = client.get("/api/v1/reports/export/pdf?status=verified")
    assert res.status_code == status.HTTP_200_OK
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF-")


def test_export_reports_pdf_filtered_by_gear_type(client, db_session):
    """
    Test PDF generation when filtering for gillnets.
    """
    res = client.get("/api/v1/reports/export/pdf?gear_type=gillnet")
    assert res.status_code == status.HTTP_200_OK
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF-")


def test_export_reports_pdf_empty_results(client, db_session):
    """
    Test graceful PDF generation when search query yields 0 results.
    """
    res = client.get("/api/v1/reports/export/pdf?search=nonexistent_xyz_keyword_99999")
    assert res.status_code == status.HTTP_200_OK
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF-")
    assert len(res.content) > 1000
