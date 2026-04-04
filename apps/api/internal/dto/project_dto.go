package dto

type CreateProjectRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=100"`
	Description *string `json:"description,omitempty"`
}

type UpdateProjectRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=1,max=100"`
	Description *string `json:"description,omitempty"`
}

type CreatePageRequest struct {
	Name string `json:"name" validate:"required,min=1,max=100"`
}

type UpdatePageRequest struct {
	Name  *string `json:"name,omitempty"`
	Order *int    `json:"order,omitempty"`
}
