"""create runs jobs assets tables

Revision ID: 20251214_create_runs_jobs_assets
Revises: 
Create Date: 2025-12-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20251214_create_runs_jobs_assets'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'runs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('intent', sa.String(), nullable=False),
        sa.Column('input', sa.JSON(), nullable=True),
        sa.Column('plan', sa.JSON(), nullable=True),
        sa.Column('critique', sa.JSON(), nullable=True),
        sa.Column('exec_result', sa.JSON(), nullable=True),
        sa.Column('state', sa.String(), nullable=False, server_default='CREATED'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_runs_state', 'runs', ['state'])

    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id'), nullable=False),
        sa.Column('step', sa.String(), nullable=False),
        sa.Column('op', sa.String(), nullable=True),
        sa.Column('request_id', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='queued'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_jobs_run_id', 'jobs', ['run_id'])

    op.create_table(
        'assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('run_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('runs.id'), nullable=True),
        sa.Column('asset_id', sa.String(), nullable=False, unique=True),
        sa.Column('source_url', sa.String(), nullable=True),
        sa.Column('thumbnails', sa.JSON(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_assets_run_id', 'assets', ['run_id'])

def downgrade():
    op.drop_index('ix_assets_run_id', table_name='assets')
    op.drop_table('assets')
    op.drop_index('ix_jobs_run_id', table_name='jobs')
    op.drop_table('jobs')
    op.drop_index('ix_runs_state', table_name='runs')
    op.drop_table('runs')
