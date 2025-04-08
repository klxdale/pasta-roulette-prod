# Load required libraries
library(tidyverse)  # Includes ggplot2, dplyr, and readr
library(lubridate)  # For handling dates

# Read the CSV file
# Assuming your CSV has columns: date, value
data <- read_csv("your_data.csv") %>%
  # Clean the data
  mutate(
    # Convert date string to Date object
    date = as.Date(date),
    # Convert value to numeric, removing any non-numeric characters
    value = as.numeric(gsub("[^0-9.]", "", value))
  ) %>%
  # Remove any rows with NA values
  na.omit()

# Create the line chart
ggplot(data, aes(x = date, y = value)) +
  geom_line(color = "#2c3e50", size = 1) +  # Add line
  geom_point(color = "#3498db", size = 2) +  # Add points
  # Customize the theme
  theme_minimal() +
  # Add labels
  labs(
    title = "Time Series Data Visualization",
    subtitle = "Data from your CSV file",
    x = "Date",
    y = "Value",
    caption = "Source: Your Data Source"
  ) +
  # Customize the theme further
  theme(
    plot.title = element_text(size = 16, face = "bold"),
    plot.subtitle = element_text(size = 12, color = "gray50"),
    axis.title = element_text(size = 12),
    axis.text = element_text(size = 10),
    # Rotate x-axis labels if needed
    axis.text.x = element_text(angle = 45, hjust = 1)
  ) +
  # Add gridlines
  panel_grid_major = element_line(color = "gray90") +
  panel_grid_minor = element_line(color = "gray95")

# Save the plot
ggsave("time_series_plot.png", width = 10, height = 6, dpi = 300) 