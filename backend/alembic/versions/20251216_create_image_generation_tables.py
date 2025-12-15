"""create image generation tables

Revision ID: 20251216_create_image_generation_tables
Revises: 20251215_add_billing_usage_tables
Create Date: 2025-12-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20251216_create_image_generation_tables'
down_revision = '20251215_add_billing_usage_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create image_jobs table
    op.create_table(
        'image_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.String(255), nullable=True),
        sa.Column('request_id', sa.String(255), nullable=True, unique=True),
        sa.Column('run_id', sa.String(255), nullable=False, unique=True),
        sa.Column('prompt_text', sa.Text(), nullable=True),
        sa.Column('prompt_hash', sa.String(64), nullable=False),
        sa.Column('fibo_json', sa.JSON(), nullable=True),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('seed', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='queued'),
        sa.Column('cost_cents', sa.Integer(), nullable=True),
        sa.Column('cost_estimate_cents', sa.Integer(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('num_variants', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('guidance_images', sa.JSON(), nullable=True),
        sa.Column('controlnet_config', sa.JSON(), nullable=True),
        sa.Column('refine_mode', sa.String(50), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('sse_token', sa.String(255), nullable=True),
        sa.Column('cached_hit', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_image_jobs_user_id', 'image_jobs', ['user_id'])
    op.create_index('ix_image_jobs_request_id', 'image_jobs', ['request_id'])
    op.create_index('ix_image_jobs_run_id', 'image_jobs', ['run_id'])
    op.create_index('ix_image_jobs_prompt_hash', 'image_jobs', ['prompt_hash'])
    op.create_index('ix_image_jobs_model_version', 'image_jobs', ['model_version'])
    op.create_index('ix_image_jobs_seed', 'image_jobs', ['seed'])
    op.create_index('ix_image_jobs_status', 'image_jobs', ['status'])
    op.create_index('ix_image_jobs_created_at', 'image_jobs', ['created_at'])

    # Create artifacts table
    op.create_table(
        'artifacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('image_jobs.id'), nullable=False),
        sa.Column('variant_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('url', sa.String(1024), nullable=False),
        sa.Column('thumb_url', sa.String(1024), nullable=True),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('mime', sa.String(100), nullable=True, server_default='image/png'),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('evaluator_score', sa.Float(), nullable=True),
        sa.Column('semantic_score', sa.Float(), nullable=True),
        sa.Column('perceptual_score', sa.Float(), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_artifacts_job_id', 'artifacts', ['job_id'])
    op.create_index('ix_artifacts_evaluator_score', 'artifacts', ['evaluator_score'])
    op.create_index('ix_artifacts_is_primary', 'artifacts', ['is_primary'])
    op.create_index('ix_artifacts_created_at', 'artifacts', ['created_at'])

    # Create prompt_cache table
    op.create_table(
        'prompt_cache',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('prompt_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('seed', sa.Integer(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.Column('artifact_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('artifacts.id'), nullable=False),
        sa.Column('hit_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_prompt_cache_prompt_hash', 'prompt_cache', ['prompt_hash'])
    op.create_index('ix_prompt_cache_model_version', 'prompt_cache', ['model_version'])
    op.create_index('ix_prompt_cache_seed', 'prompt_cache', ['seed'])
    op.create_index('ix_prompt_cache_expires_at', 'prompt_cache', ['expires_at'])
    op.create_index('ix_prompt_cache_created_at', 'prompt_cache', ['created_at'])
    # Composite index for fast lookups
    op.create_index(
        'idx_prompt_cache_lookup',
        'prompt_cache',
        ['prompt_hash', 'model_version', 'seed', 'width', 'height']
    )

    # Create evaluations table
    op.create_table(
        'evaluations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('artifact_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('artifacts.id'), nullable=False, unique=True),
        sa.Column('clip_embedding', sa.JSON(), nullable=True),
        sa.Column('lpips_value', sa.Float(), nullable=True),
        sa.Column('semantic_score', sa.Float(), nullable=True),
        sa.Column('perceptual_score', sa.Float(), nullable=True),
        sa.Column('reference_artifact_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('artifacts.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_evaluations_artifact_id', 'evaluations', ['artifact_id'])
    op.create_index('ix_evaluations_semantic_score', 'evaluations', ['semantic_score'])
    op.create_index('ix_evaluations_perceptual_score', 'evaluations', ['perceptual_score'])
    op.create_index('ix_evaluations_created_at', 'evaluations', ['created_at'])


def downgrade():
    op.drop_index('ix_evaluations_created_at', table_name='evaluations')
    op.drop_index('ix_evaluations_perceptual_score', table_name='evaluations')
    op.drop_index('ix_evaluations_semantic_score', table_name='evaluations')
    op.drop_index('ix_evaluations_artifact_id', table_name='evaluations')
    op.drop_table('evaluations')
    
    op.drop_index('idx_prompt_cache_lookup', table_name='prompt_cache')
    op.drop_index('ix_prompt_cache_created_at', table_name='prompt_cache')
    op.drop_index('ix_prompt_cache_expires_at', table_name='prompt_cache')
    op.drop_index('ix_prompt_cache_seed', table_name='prompt_cache')
    op.drop_index('ix_prompt_cache_model_version', table_name='prompt_cache')
    op.drop_index('ix_prompt_cache_prompt_hash', table_name='prompt_cache')
    op.drop_table('prompt_cache')
    
    op.drop_index('ix_artifacts_created_at', table_name='artifacts')
    op.drop_index('ix_artifacts_is_primary', table_name='artifacts')
    op.drop_index('ix_artifacts_evaluator_score', table_name='artifacts')
    op.drop_index('ix_artifacts_job_id', table_name='artifacts')
    op.drop_table('artifacts')
    
    op.drop_index('ix_image_jobs_created_at', table_name='image_jobs')
    op.drop_index('ix_image_jobs_status', table_name='image_jobs')
    op.drop_index('ix_image_jobs_seed', table_name='image_jobs')
    op.drop_index('ix_image_jobs_model_version', table_name='image_jobs')
    op.drop_index('ix_image_jobs_prompt_hash', table_name='image_jobs')
    op.drop_index('ix_image_jobs_run_id', table_name='image_jobs')
    op.drop_index('ix_image_jobs_request_id', table_name='image_jobs')
    op.drop_index('ix_image_jobs_user_id', table_name='image_jobs')
    op.drop_table('image_jobs')

