import aioboto3  # type: ignore[import]
import base64
import tempfile
import uuid
from pathlib import Path

from ats.config import settings

async def download_file_from_s3(s3_key: str) -> tuple[str, str]:
    """Download a file from S3 to a temporary local file.
    
    Args:
        s3_key: S3 key of the file to download
        
    Returns:
        Tuple of (path to the temporary local file, original filename)
    """
    session = aioboto3.Session()
    async with session.client(
        's3',
        aws_access_key_id=settings.yandex_s3_access_key_id,
        aws_secret_access_key=settings.yandex_s3_secret_access_key,
        endpoint_url=settings.yandex_s3_endpoint_url,
        region_name=settings.yandex_s3_region
    ) as s3_client:
        # Get file metadata to retrieve original filename
        response = await s3_client.head_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key
        )
        
        # Decode original filename from metadata
        encoded_filename = response.get('Metadata', {}).get('original-filename-b64', '')
        original_filename = ''
        if encoded_filename:
            try:
                original_filename = base64.b64decode(encoded_filename.encode('ascii')).decode('utf-8')
            except Exception:
                # Fallback to using s3_key if decoding fails
                original_filename = s3_key
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(original_filename).suffix) as temp_file:
            await s3_client.download_file(
                settings.s3_bucket_name,
                s3_key,
                temp_file.name
            )
            return temp_file.name, original_filename


async def upload_file_to_s3(filename: str, content: bytes, content_type: str) -> str:

    # Generate UUID5 key based on original filename
    namespace = uuid.NAMESPACE_URL
    file_key = str(uuid.uuid5(namespace, filename))
    
    # Encode original filename to base64 for S3 metadata (S3 only supports ASCII)
    encoded_filename = base64.b64encode(filename.encode('utf-8')).decode('ascii')
    

    # Upload to S3 using async client
    session = aioboto3.Session()
    async with session.client(
        "s3",
        aws_access_key_id=settings.yandex_s3_access_key_id,
        aws_secret_access_key=settings.yandex_s3_secret_access_key,
        endpoint_url=settings.yandex_s3_endpoint_url,
        region_name=settings.yandex_s3_region,
    ) as s3_client:
        await s3_client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=file_key,
            Body=content,
            Metadata={
                "original-filename-b64": encoded_filename,
                "content-type": content_type,
            },
        )
    return file_key