import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4A5568"))

        # Skip header/footer on title page (page 1)
        if self._pageNumber > 1:
            # Header
            self.drawString(54, 750, "SCHOOL OF COMPUTER SCIENCE  |  MAJOR PROJECT REPORT")
            self.setStrokeColor(colors.HexColor("#CBD5E0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

            # Footer
            self.line(54, 48, 558, 48)
            self.drawString(54, 34, "Multi-Agent DevOps Incident Management")
            page_text = f"Page {self._pageNumber}"
            self.drawRightString(558, 34, page_text)
        else:
            # Title Page running footer
            self.drawString(54, 34, f"Multi-Agent DevOps Incident Management  |  Page {self._pageNumber}")

        self.restoreState()

def build_pdf(filename="Major_Project_Report_MultiAgent_DevOps.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY_COLOR = colors.HexColor("#1A365D")   # Deep Navy
    SECONDARY_COLOR = colors.HexColor("#2B6CB0") # Slate Blue
    TEXT_COLOR = colors.HexColor("#2D3748")      # Charcoal Body
    BG_LIGHT = colors.HexColor("#F7FAFC")        # Soft Light Grey
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=PRIMARY_COLOR,
        alignment=1, # Center
        spaceAfter=15
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=SECONDARY_COLOR,
        alignment=1,
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=20,
        textColor=PRIMARY_COLOR,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY_COLOR,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=TEXT_COLOR,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1A202C"),
        backColor=colors.HexColor("#EDF2F7"),
        borderColor=colors.HexColor("#CBD5E0"),
        borderWidth=0.5,
        borderPadding=8,
        spaceBefore=6,
        spaceAfter=10
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_COLOR
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # ==========================================
    # PAGE 1: COVER PAGE
    # ==========================================
    story.append(Spacer(1, 40))
    story.append(Paragraph("SCHOOL OF COMPUTER SCIENCE  |  MAJOR PROJECT REPORT", ParagraphStyle('HeaderTop', fontName='Helvetica-Bold', fontSize=10, textColor=SECONDARY_COLOR, alignment=1)))
    story.append(Spacer(1, 40))

    story.append(Paragraph("Major Project Report", title_style))
    story.append(Paragraph("For", ParagraphStyle('ForText', fontName='Helvetica', fontSize=12, alignment=1, spaceAfter=15)))
    story.append(Paragraph("MULTI-AGENT DEVOPS INCIDENT MANAGEMENT AND RESPONSE SYSTEM", ParagraphStyle('MainTitle', fontName='Helvetica-Bold', fontSize=18, leading=24, textColor=PRIMARY_COLOR, alignment=1, spaceAfter=20)))

    story.append(Paragraph("26 August 2026", ParagraphStyle('DateText', fontName='Helvetica-Bold', fontSize=11, alignment=1, spaceAfter=40)))

    story.append(Paragraph("<b>Prepared by</b>", ParagraphStyle('PrepBy', fontName='Helvetica-Bold', fontSize=11, alignment=1, spaceAfter=10)))

    # Authors Table
    authors_data = [
        [Paragraph("Specialization", table_header_style), Paragraph("SAP ID", table_header_style), Paragraph("Name", table_header_style)],
        [Paragraph("Cloud Computing / DevOps", table_cell_style), Paragraph("500124131", table_cell_style), Paragraph("Atharva Sharma", table_cell_bold)],
        [Paragraph("Cloud Computing / DevOps", table_cell_style), Paragraph("500122613", table_cell_style), Paragraph("Saurabh Nautiyal", table_cell_bold)],
        [Paragraph("Cloud Computing / DevOps", table_cell_style), Paragraph("500125209", table_cell_style), Paragraph("Nikhil Kumar Singh", table_cell_bold)],
        [Paragraph("Cloud Computing / DevOps", table_cell_style), Paragraph("500125722", table_cell_style), Paragraph("Kunal Pal", table_cell_bold)],
    ]
    t_authors = Table(authors_data, colWidths=[2.5*inch, 1.5*inch, 2.5*inch])
    t_authors.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_authors)

    story.append(Spacer(1, 60))
    story.append(Paragraph("<b>School of Computer Science</b>", ParagraphStyle('Univ1', fontName='Helvetica-Bold', fontSize=12, alignment=1, spaceAfter=4)))
    story.append(Paragraph("UNIVERSITY OF PETROLEUM & ENERGY STUDIES", ParagraphStyle('Univ2', fontName='Helvetica-Bold', fontSize=12, textColor=PRIMARY_COLOR, alignment=1, spaceAfter=4)))
    story.append(Paragraph("DEHRADUN – 248007, UTTARAKHAND", ParagraphStyle('Univ3', fontName='Helvetica', fontSize=10, alignment=1)))

    story.append(PageBreak())

    # ==========================================
    # PAGE 2: TABLE OF CONTENTS
    # ==========================================
    story.append(Paragraph("TABLE OF CONTENTS", ParagraphStyle('TOCTitle', fontName='Helvetica-Bold', fontSize=16, textColor=PRIMARY_COLOR, alignment=1, spaceAfter=20)))

    toc_data = [
        [Paragraph("No.", table_header_style), Paragraph("Topic", table_header_style), Paragraph("Page No.", table_header_style)],
        [Paragraph("1", table_cell_bold), Paragraph("INTRODUCTION", table_cell_bold), Paragraph("4", table_cell_style)],
        [Paragraph("1.1", table_cell_style), Paragraph("Purpose of the Project", table_cell_style), Paragraph("4", table_cell_style)],
        [Paragraph("1.2", table_cell_style), Paragraph("Target Beneficiary", table_cell_style), Paragraph("4", table_cell_style)],
        [Paragraph("1.3", table_cell_style), Paragraph("Project Scope", table_cell_style), Paragraph("5", table_cell_style)],
        [Paragraph("1.4", table_cell_style), Paragraph("Existing Solutions and Research Gap", table_cell_style), Paragraph("5", table_cell_style)],
        [Paragraph("1.5", table_cell_style), Paragraph("References", table_cell_style), Paragraph("6", table_cell_style)],
        [Paragraph("2", table_cell_bold), Paragraph("PROJECT DESCRIPTION", table_cell_bold), Paragraph("7", table_cell_style)],
        [Paragraph("2.1", table_cell_style), Paragraph("Reference Algorithm", table_cell_style), Paragraph("7", table_cell_style)],
        [Paragraph("2.2", table_cell_style), Paragraph("Characteristics of Data and Data Structures", table_cell_style), Paragraph("8", table_cell_style)],
        [Paragraph("2.3", table_cell_style), Paragraph("SWOT Analysis", table_cell_style), Paragraph("9", table_cell_style)],
        [Paragraph("2.4", table_cell_style), Paragraph("Project Features", table_cell_style), Paragraph("10", table_cell_style)],
        [Paragraph("2.5", table_cell_style), Paragraph("User Classes and Characteristics", table_cell_style), Paragraph("11", table_cell_style)],
        [Paragraph("2.6", table_cell_style), Paragraph("Design and Implementation Constraints", table_cell_style), Paragraph("11", table_cell_style)],
        [Paragraph("2.7", table_cell_style), Paragraph("Design Diagrams", table_cell_style), Paragraph("12", table_cell_style)],
        [Paragraph("2.8", table_cell_style), Paragraph("Assumptions and Dependencies", table_cell_style), Paragraph("21", table_cell_style)],
        [Paragraph("3", table_cell_bold), Paragraph("SYSTEM REQUIREMENTS", table_cell_bold), Paragraph("22", table_cell_style)],
        [Paragraph("3.1", table_cell_style), Paragraph("User Interface", table_cell_style), Paragraph("22", table_cell_style)],
        [Paragraph("3.2", table_cell_style), Paragraph("Software Interface", table_cell_style), Paragraph("23", table_cell_style)],
        [Paragraph("3.3", table_cell_style), Paragraph("Database Interface", table_cell_style), Paragraph("23", table_cell_style)],
        [Paragraph("3.4", table_cell_style), Paragraph("Protocols", table_cell_style), Paragraph("24", table_cell_style)],
        [Paragraph("4", table_cell_bold), Paragraph("NON-FUNCTIONAL REQUIREMENTS", table_cell_bold), Paragraph("25", table_cell_style)],
        [Paragraph("4.1", table_cell_style), Paragraph("Performance Requirements", table_cell_style), Paragraph("25", table_cell_style)],
        [Paragraph("4.2", table_cell_style), Paragraph("Security Requirements", table_cell_style), Paragraph("26", table_cell_style)],
        [Paragraph("4.3", table_cell_style), Paragraph("Software Quality Attributes", table_cell_style), Paragraph("27", table_cell_style)],
        [Paragraph("5", table_cell_bold), Paragraph("OTHER REQUIREMENTS", table_cell_bold), Paragraph("28", table_cell_style)],
        [Paragraph("5.1", table_cell_style), Paragraph("Testing and Acceptance", table_cell_style), Paragraph("28", table_cell_style)],
        [Paragraph("5.2", table_cell_style), Paragraph("Ethical and Operational Boundaries", table_cell_style), Paragraph("28", table_cell_style)],
        [Paragraph("Appendix A", table_cell_bold), Paragraph("Glossary", table_cell_style), Paragraph("29", table_cell_style)],
        [Paragraph("Appendix B", table_cell_bold), Paragraph("Analysis Model", table_cell_style), Paragraph("30", table_cell_style)],
        [Paragraph("Appendix C", table_cell_bold), Paragraph("Issues List", table_cell_style), Paragraph("31", table_cell_style)],
    ]

    t_toc = Table(toc_data, colWidths=[1.0*inch, 4.5*inch, 1.0*inch])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_toc)

    story.append(PageBreak())

    # ==========================================
    # PAGE 3: REVISION HISTORY
    # ==========================================
    story.append(Paragraph("REVISION HISTORY", ParagraphStyle('RevTitle', fontName='Helvetica-Bold', fontSize=14, textColor=PRIMARY_COLOR, spaceAfter=15)))

    rev_data = [
        [Paragraph("Date", table_header_style), Paragraph("Change", table_header_style), Paragraph("Reason for Changes", table_header_style), Paragraph("Mentor Signature", table_header_style)],
        [
            Paragraph("26-08-2026", table_cell_style),
            Paragraph("Initial project report draft", table_cell_bold),
            Paragraph("Initial project definition, problem statement, architecture, requirements and research direction.", table_cell_style),
            Paragraph("", table_cell_style)
        ],
        [
            Paragraph("26-08-2026", table_cell_style),
            Paragraph("Architecture revision", table_cell_bold),
            Paragraph("Added multi-agent workflow, human-in-the-loop controls, evaluation model and UML diagrams.", table_cell_style),
            Paragraph("", table_cell_style)
        ]
    ]

    t_rev = Table(rev_data, colWidths=[1.2*inch, 1.8*inch, 2.3*inch, 1.2*inch])
    t_rev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_rev)

    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>Document status:</b> Project report / synopsis draft. The report defines the proposed prototype architecture and evaluation plan; implementation details may be refined during development.", ParagraphStyle('DocStat', fontName='Helvetica-Oblique', fontSize=9, leading=13, textColor=TEXT_COLOR)))

    story.append(PageBreak())

    # ==========================================
    # CHAPTER 1: INTRODUCTION
    # ==========================================
    story.append(Paragraph("1 INTRODUCTION", h1_style))
    
    story.append(Paragraph("1.1 Purpose of the Project", h2_style))
    story.append(Paragraph(
        "Modern DevOps environments continuously generate operational telemetry from cloud infrastructure, applications, databases, APIs and deployment pipelines. When an incident occurs, engineers must interpret this telemetry under time pressure, correlate independent signals, determine the likely root cause, select remediation actions and document the outcome. The problem becomes more difficult as systems become distributed and the number of services, dependencies and monitoring signals increases.",
        body_style
    ))
    story.append(Paragraph(
        "The proposed project introduces a multi-agent incident-management layer in which specialised AI agents collaborate across the incident lifecycle. The <b>Detector</b> focuses on identifying abnormal behaviour, the <b>Analyst</b> performs contextual diagnosis, the <b>Responder</b> prepares and controls remediation actions, and the <b>Reporter</b> converts the final incident timeline into structured postmortem knowledge.",
        body_style
    ))
    story.append(Paragraph(
        "The project is intended as an engineering and research prototype rather than a claim of unrestricted autonomous operations. Human approval remains part of the architecture for consequential production actions. The central research direction is to evaluate whether explicit agent specialisation, structured handoffs and historical context can improve incident-response quality compared with a single general-purpose agent.",
        body_style
    ))

    story.append(Paragraph("1.2 Target Beneficiary", h2_style))
    story.append(Paragraph("The primary beneficiaries are DevOps engineers, site reliability engineers, cloud engineers, platform teams and technical operations teams responsible for maintaining production services. Engineering managers and project evaluators can also use the system to inspect incident timelines, proposed actions, outcomes and generated postmortems.", body_style))
    
    story.append(Paragraph("• <b>DevOps/SRE engineers:</b> reduced repetitive investigation and documentation effort.", bullet_style))
    story.append(Paragraph("• <b>Cloud and platform engineers:</b> structured diagnosis and controlled remediation recommendations.", bullet_style))
    story.append(Paragraph("• <b>Operations teams:</b> consolidated incident context and a consistent response workflow.", bullet_style))
    story.append(Paragraph("• <b>Engineering managers:</b> visibility into incident timelines, response quality and recurring failure patterns.", bullet_style))
    story.append(Paragraph("• <b>Academic researchers:</b> an experimental platform for evaluating multi-agent specialisation and context propagation.", bullet_style))

    story.append(Paragraph("1.3 Project Scope", h2_style))
    story.append(Paragraph("The project will implement a working prototype for cloud incident management using synthetic or controlled operational incidents. The scope covers detection, diagnosis, remediation recommendation, human approval, resolution verification and postmortem generation.", body_style))

    scope_data = [
        [Paragraph("In Scope", table_header_style), Paragraph("Out of Scope", table_header_style)],
        [Paragraph("Cloud/DevOps incident detection using metrics and logs", table_cell_style), Paragraph("Universal support for every cloud provider and monitoring platform", table_cell_style)],
        [Paragraph("Specialised Detector, Analyst, Responder and Reporter agents", table_cell_style), Paragraph("Unrestricted autonomous control of production infrastructure", table_cell_style)],
        [Paragraph("Event-driven communication between agents", table_cell_style), Paragraph("Replacing established commercial AIOps platforms", table_cell_style)],
        [Paragraph("LLM-assisted diagnosis and structured reasoning", table_cell_style), Paragraph("Guaranteeing perfect root-cause accuracy", table_cell_style)],
        [Paragraph("Risk-based remediation proposal and human approval", table_cell_style), Paragraph("Autonomous high-risk production changes without approval", table_cell_style)],
        [Paragraph("Incident timeline, postmortem and historical knowledge", table_cell_style), Paragraph("Legal, operational or security certification", table_cell_style)],
        [Paragraph("Controlled evaluation against incident scenarios", table_cell_style), Paragraph("Claiming superiority over proprietary commercial systems without experiments", table_cell_style)]
    ]
    t_scope = Table(scope_data, colWidths=[3.2*inch, 3.3*inch])
    t_scope.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_scope)

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Project Objectives:</b>", h2_style))
    story.append(Paragraph("• Design a modular multi-agent architecture for the end-to-end incident lifecycle.", bullet_style))
    story.append(Paragraph("• Detect operational anomalies and convert them into structured incident events.", bullet_style))
    story.append(Paragraph("• Provide context-rich root-cause analysis using metrics, logs, deployments and historical incidents.", bullet_style))
    story.append(Paragraph("• Generate ranked remediation proposals with explicit risk and approval states.", bullet_style))
    story.append(Paragraph("• Maintain human authority over consequential infrastructure actions.", bullet_style))
    story.append(Paragraph("• Generate structured postmortems and preserve incident knowledge for future diagnosis.", bullet_style))
    story.append(Paragraph("• Evaluate specialised-agent and general-agent approaches using measurable quality metrics.", bullet_style))

    story.append(PageBreak())

    # ==========================================
    # CHAPTER 2: PROJECT DESCRIPTION
    # ==========================================
    story.append(Paragraph("2 PROJECT DESCRIPTION", h1_style))
    story.append(Paragraph("2.1 Reference Algorithm", h2_style))
    story.append(Paragraph("The reference method is an event-driven incident-management algorithm. It separates detection from reasoning and reasoning from infrastructure authority.", body_style))

    algo_code = """MultiAgentIncidentResponse(incident):
    event <- Detector.detect(incident.telemetry)
    context <- Analyst.collectContext(event)
    diagnosis <- Analyst.reason(context)
    actions <- Responder.propose(diagnosis)
    decision <- ApprovalPolicy.evaluate(actions)
    if decision.requiresHumanApproval:
        decision <- HumanApproval.review(actions)
    if decision.approved:
        result <- Responder.execute(actions)
        verify(result)
    report <- Reporter.generateTimeline(event, context, diagnosis, actions, result)
    KnowledgeBase.store(report)
    return report"""
    story.append(Paragraph(algo_code.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    story.append(Paragraph("Incident State Machine", h2_style))
    states_data = [
        [Paragraph("State", table_header_style), Paragraph("Meaning", table_header_style)],
        [Paragraph("DETECTED", table_cell_bold), Paragraph("An anomaly has crossed the incident-detection boundary.", table_cell_style)],
        [Paragraph("INVESTIGATING", table_cell_bold), Paragraph("The Analyst is collecting and correlating evidence.", table_cell_style)],
        [Paragraph("DIAGNOSED", table_cell_bold), Paragraph("A probable cause and supporting evidence have been produced.", table_cell_style)],
        [Paragraph("ACTION_PROPOSED", table_cell_bold), Paragraph("The Responder has generated one or more remediation options.", table_cell_style)],
        [Paragraph("AWAITING_APPROVAL", table_cell_bold), Paragraph("A consequential action requires human confirmation.", table_cell_style)],
        [Paragraph("REMEDIATING", table_cell_bold), Paragraph("An approved action is being executed.", table_cell_style)],
        [Paragraph("RESOLVED", table_cell_bold), Paragraph("The service has recovered or the incident is otherwise contained.", table_cell_style)],
        [Paragraph("DOCUMENTED", table_cell_bold), Paragraph("A postmortem and action items have been generated.", table_cell_style)],
        [Paragraph("CLOSED", table_cell_bold), Paragraph("Incident workflow completed and indexed into organizational memory.", table_cell_style)]
    ]
    t_states = Table(states_data, colWidths=[2.2*inch, 4.3*inch])
    t_states.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_states)

    story.append(Spacer(1, 10))
    story.append(Paragraph("2.2 Data Structures", h2_style))
    struct_data = [
        [Paragraph("Structure", table_header_style), Paragraph("Purpose", table_header_style), Paragraph("Representative Fields", table_header_style)],
        [Paragraph("Incident Record", table_cell_bold), Paragraph("Canonical representation of incident", table_cell_style), Paragraph("incident_id, service, severity, status, start_time, end_time", table_cell_style)],
        [Paragraph("Telemetry Event", table_cell_bold), Paragraph("Raw or normalized metrics", table_cell_style), Paragraph("metric, value, timestamp, source, threshold, anomaly_score", table_cell_style)],
        [Paragraph("Log Evidence", table_cell_bold), Paragraph("Application & system logs", table_cell_style), Paragraph("log_id, timestamp, service, message, pattern, severity", table_cell_style)],
        [Paragraph("Diagnosis Record", table_cell_bold), Paragraph("Analyst output", table_cell_style), Paragraph("root_cause, confidence, evidence_ids, blast_radius, alternatives", table_cell_style)],
        [Paragraph("Remediation Action", table_cell_bold), Paragraph("Candidate or executed response", table_cell_style), Paragraph("action_id, type, risk, rationale, approval_status, result", table_cell_style)],
        [Paragraph("Postmortem", table_cell_bold), Paragraph("Structured incident knowledge", table_cell_style), Paragraph("impact, root_cause, timeline, remediation, action_items", table_cell_style)]
    ]
    t_struct = Table(struct_data, colWidths=[1.8*inch, 2.2*inch, 2.5*inch])
    t_struct.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_struct)

    story.append(PageBreak())

    # ==========================================
    # CHAPTER 3 & 4: SYSTEM & NON-FUNCTIONAL REQUIREMENTS
    # ==========================================
    story.append(Paragraph("3 SYSTEM REQUIREMENTS", h1_style))
    story.append(Paragraph("3.1 User Interface & Agent Architecture", h2_style))
    story.append(Paragraph("The web dashboard provides an operational control view displaying live telemetry, agent execution status, pending approvals, and historical incident postmortems.", body_style))

    story.append(Paragraph("4 NON-FUNCTIONAL REQUIREMENTS", h1_style))
    story.append(Paragraph("4.1 Performance Requirements", h2_style))
    perf_data = [
        [Paragraph("Requirement", table_header_style), Paragraph("Target Target", table_header_style), Paragraph("Measurement Condition", table_header_style)],
        [Paragraph("Incident event creation", table_cell_style), Paragraph("≤ 1 second", table_cell_bold), Paragraph("Local event generation after detector decision", table_cell_style)],
        [Paragraph("Event delivery", table_cell_style), Paragraph("≤ 500 ms typical", table_cell_bold), Paragraph("Healthy event bus and local deployment", table_cell_style)],
        [Paragraph("Dashboard response", table_cell_style), Paragraph("≤ 2 seconds", table_cell_bold), Paragraph("Indexed query without external cloud call", table_cell_style)],
        [Paragraph("Historical incident retrieval", table_cell_style), Paragraph("≤ 2 seconds", table_cell_bold), Paragraph("Typical similarity/search request", table_cell_style)],
        [Paragraph("Rule/risk evaluation", table_cell_style), Paragraph("≤ 500 ms", table_cell_bold), Paragraph("Local deterministic policy checks", table_cell_style)]
    ]
    t_perf = Table(perf_data, colWidths=[2.2*inch, 1.5*inch, 2.8*inch])
    t_perf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_perf)

    story.append(Spacer(1, 15))
    story.append(Paragraph("4.2 Security Requirements", h2_style))
    sec_data = [
        [Paragraph("Control Area", table_header_style), Paragraph("Requirement", table_header_style)],
        [Paragraph("Authentication", table_cell_bold), Paragraph("Centralized authentication with MFA support where available.", table_cell_style)],
        [Paragraph("Authorization & RBAC", table_cell_bold), Paragraph("Role-based access control for operator, administrator, and auditor roles.", table_cell_style)],
        [Paragraph("LLM Input Safety", table_cell_bold), Paragraph("Treat logs and telemetry as untrusted data; isolate instructions from evidence to prevent prompt injection.", table_cell_style)],
        [Paragraph("Remediation Safety", table_cell_bold), Paragraph("Block high-risk infrastructure execution until explicit human approval is recorded.", table_cell_style)]
    ]
    t_sec = Table(sec_data, colWidths=[2.0*inch, 4.5*inch])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_sec)

    story.append(PageBreak())

    # ==========================================
    # CHAPTER 5 & APPENDICES
    # ==========================================
    story.append(Paragraph("5 OTHER REQUIREMENTS & RESEARCH EVALUATION", h1_style))
    story.append(Paragraph("5.1 Controlled Incident Scenarios", h2_style))
    
    scen_data = [
        [Paragraph("Scenario", table_header_style), Paragraph("Expected Behaviour", table_header_style), Paragraph("Acceptance Evidence", table_header_style)],
        [Paragraph("CPU saturation", table_cell_bold), Paragraph("Detector identifies anomaly; Analyst attributes likely resource saturation.", table_cell_style), Paragraph("Incident event, diagnosis and confidence score.", table_cell_style)],
        [Paragraph("Application error spike", table_cell_bold), Paragraph("Detector raises incident; Analyst correlates logs and recent deployment changes.", table_cell_style), Paragraph("Relevant evidence references and root-cause candidate.", table_cell_style)],
        [Paragraph("Database connection exhaustion", table_cell_bold), Paragraph("Analyst identifies database pool evidence and proposes safe remediation.", table_cell_style), Paragraph("Diagnosis, action proposal and approval record.", table_cell_style)],
        [Paragraph("Failed deployment", table_cell_bold), Paragraph("Analyst correlates deployment event with service degradation.", table_cell_style), Paragraph("Deployment evidence and diagnosis.", table_cell_style)],
        [Paragraph("High-risk remediation", table_cell_bold), Paragraph("Responder pauses for human approval gate.", table_cell_style), Paragraph("Approval/rejection event and execution record.", table_cell_style)]
    ]
    t_scen = Table(scen_data, colWidths=[2.0*inch, 2.5*inch, 2.0*inch])
    t_scen.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_scen)

    story.append(Spacer(1, 15))
    story.append(Paragraph("5.2 Empirical Research Evaluation Model", h2_style))
    eval_data = [
        [Paragraph("Evaluation Dimension", table_header_style), Paragraph("Definition", table_header_style), Paragraph("Evidence / Metric", table_header_style)],
        [Paragraph("Detection Accuracy", table_cell_bold), Paragraph("Proportion of known incidents detected without missed alerts.", table_cell_style), Paragraph("Incident dataset & detector output", table_cell_style)],
        [Paragraph("Diagnosis Accuracy", table_cell_bold), Paragraph("Whether correct root cause is identified or ranked highly.", table_cell_style), Paragraph("Ground-truth scenario labels", table_cell_style)],
        [Paragraph("Diagnosis Latency", table_cell_bold), Paragraph("Time between incident event and structured diagnosis.", table_cell_style), Paragraph("Timestamped agent events", table_cell_style)],
        [Paragraph("Context Efficiency", table_cell_bold), Paragraph("Information transferred relative to diagnostic benefit.", table_cell_style), Paragraph("Payload size, token usage & accuracy", table_cell_style)],
        [Paragraph("Safety Compliance", table_cell_bold), Paragraph("Ability to prevent unauthorized consequential actions.", table_cell_style), Paragraph("Approval and execution audit records", table_cell_style)]
    ]
    t_eval = Table(eval_data, colWidths=[2.0*inch, 2.5*inch, 2.0*inch])
    t_eval.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(t_eval)

    # Build PDF Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated formatted PDF report: {filename}")

if __name__ == '__main__':
    build_pdf()
