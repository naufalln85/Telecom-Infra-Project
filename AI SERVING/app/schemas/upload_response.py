from pydantic import BaseModel


class UploadSuccess(BaseModel):

    status: str

    validation: str

    model: str

    operators: list[str]