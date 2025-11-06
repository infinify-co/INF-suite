// Report Generator
// Generate reports and charts from database data

class ReportGenerator {
  constructor() {
    this.chartInstance = null;
  }

  /**
   * Generate report
   */
  generateReport(data, tableSchema, reportType = 'summary') {
    const fields = tableSchema.fields || [];
    
    switch (reportType) {
      case 'summary':
        return this.generateSummaryReport(data, fields);
      case 'chart':
        return this.generateChartReport(data, fields);
      case 'table':
        return this.generateTableReport(data, fields);
      default:
        return this.generateSummaryReport(data, fields);
    }
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(data, fields) {
    const numericFields = fields.filter(f => f.type === 'number');
    const textFields = fields.filter(f => f.type === 'text' || f.type === 'email' || f.type === 'phone');
    const booleanFields = fields.filter(f => f.type === 'boolean');
    const dateFields = fields.filter(f => f.type === 'date' || f.type === 'datetime');

    let report = {
      title: 'Data Summary Report',
      totalRecords: data.length,
      statistics: {},
      charts: []
    };

    // Numeric field statistics
    numericFields.forEach(field => {
      const values = data.map(row => parseFloat(row[field.name])).filter(v => !isNaN(v));
      if (values.length > 0) {
        report.statistics[field.name] = {
          label: field.label || field.name,
          sum: values.reduce((a, b) => a + b, 0),
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });

    // Boolean field statistics
    booleanFields.forEach(field => {
      const trueCount = data.filter(row => row[field.name] === true).length;
      const falseCount = data.length - trueCount;
      report.statistics[field.name] = {
        label: field.label || field.name,
        trueCount: trueCount,
        falseCount: falseCount,
        truePercentage: (trueCount / data.length) * 100
      };
    });

    // Text field unique values
    textFields.forEach(field => {
      const uniqueValues = [...new Set(data.map(row => row[field.name]).filter(v => v))];
      if (uniqueValues.length <= 20) { // Only show if reasonable number of unique values
        report.statistics[field.name] = {
          label: field.label || field.name,
          uniqueCount: uniqueValues.length,
          uniqueValues: uniqueValues
        };
      }
    });

    return report;
  }

  /**
   * Generate chart report
   */
  generateChartReport(data, fields, chartType = 'bar', fieldName = null) {
    if (!fieldName) {
      // Find first numeric or categorical field
      const numericField = fields.find(f => f.type === 'number');
      const textField = fields.find(f => f.type === 'text');
      fieldName = numericField?.name || textField?.name;
    }

    if (!fieldName) {
      return null;
    }

    const field = fields.find(f => f.name === fieldName);
    if (!field) return null;

    if (field.type === 'number') {
      return this.generateNumberChart(data, field, chartType);
    } else {
      return this.generateCategoryChart(data, field, chartType);
    }
  }

  /**
   * Generate number chart
   */
  generateNumberChart(data, field, chartType) {
    const values = data.map(row => parseFloat(row[field.name])).filter(v => !isNaN(v));
    
    return {
      type: chartType,
      field: field.label || field.name,
      data: values,
      labels: data.map((row, i) => `Record ${i + 1}`)
    };
  }

  /**
   * Generate category chart
   */
  generateCategoryChart(data, field, chartType) {
    const counts = {};
    data.forEach(row => {
      const value = row[field.name] || 'Unknown';
      counts[value] = (counts[value] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    return {
      type: chartType,
      field: field.label || field.name,
      labels: labels,
      data: values
    };
  }

  /**
   * Render chart in container
   */
  renderChart(containerId, chartData) {
    if (!window.Chart) {
      console.error('Chart.js not loaded');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous chart
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const canvas = document.createElement('canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    let chartConfig = {};

    switch (chartData.type) {
      case 'bar':
        chartConfig = {
          type: 'bar',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: chartData.field,
              data: chartData.data,
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        };
        break;

      case 'pie':
        chartConfig = {
          type: 'pie',
          data: {
            labels: chartData.labels,
            datasets: [{
              data: chartData.data,
              backgroundColor: [
                'rgba(59, 130, 246, 0.5)',
                'rgba(16, 185, 129, 0.5)',
                'rgba(245, 158, 11, 0.5)',
                'rgba(239, 68, 68, 0.5)',
                'rgba(139, 92, 246, 0.5)',
                'rgba(236, 72, 153, 0.5)'
              ]
            }]
          },
          options: {
            responsive: true
          }
        };
        break;

      case 'line':
        chartConfig = {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [{
              label: chartData.field,
              data: chartData.data,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        };
        break;
    }

    this.chartInstance = new Chart(ctx, chartConfig);
  }

  /**
   * Show report modal
   */
  showReportModal(data, tableSchema) {
    const container = document.getElementById('report-modal-container') || this.createReportContainer();
    
    const report = this.generateReport(data, tableSchema, 'summary');
    const chartData = this.generateChartReport(data, tableSchema.fields, 'bar');

    container.innerHTML = `
      <div class="report-modal">
        <div class="report-modal-content">
          <div class="report-header">
            <h2>Report: ${tableSchema.name || 'Data Report'}</h2>
            <button class="btn-icon" onclick="reportGenerator.closeReport()">×</button>
          </div>

          <div class="report-body">
            <div class="report-summary">
              <h3>Summary</h3>
              <div class="summary-stats">
                <div class="stat-card">
                  <div class="stat-label">Total Records</div>
                  <div class="stat-value">${report.totalRecords}</div>
                </div>
              </div>

              ${Object.keys(report.statistics).map(fieldName => {
                const stat = report.statistics[fieldName];
                return `
                  <div class="stat-section">
                    <h4>${stat.label}</h4>
                    ${stat.sum !== undefined ? `
                      <div class="stat-row">
                        <span>Sum:</span> <strong>${stat.sum.toFixed(2)}</strong>
                      </div>
                      <div class="stat-row">
                        <span>Average:</span> <strong>${stat.average.toFixed(2)}</strong>
                      </div>
                      <div class="stat-row">
                        <span>Min:</span> <strong>${stat.min}</strong> | 
                        <span>Max:</span> <strong>${stat.max}</strong>
                      </div>
                    ` : ''}
                    ${stat.trueCount !== undefined ? `
                      <div class="stat-row">
                        <span>Yes:</span> <strong>${stat.trueCount}</strong> (${stat.truePercentage.toFixed(1)}%) | 
                        <span>No:</span> <strong>${stat.falseCount}</strong>
                      </div>
                    ` : ''}
                    ${stat.uniqueCount !== undefined ? `
                      <div class="stat-row">
                        <span>Unique Values:</span> <strong>${stat.uniqueCount}</strong>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            ${chartData ? `
              <div class="report-chart">
                <h3>Chart</h3>
                <div class="chart-type-selector">
                  <button class="btn-small" onclick="reportGenerator.switchChartType('bar')">Bar</button>
                  <button class="btn-small" onclick="reportGenerator.switchChartType('pie')">Pie</button>
                  <button class="btn-small" onclick="reportGenerator.switchChartType('line')">Line</button>
                </div>
                <div id="report-chart-container"></div>
              </div>
            ` : ''}
          </div>

          <div class="report-actions">
            <button class="btn-secondary" onclick="reportGenerator.exportReport(report)">Export as JSON</button>
            <button class="btn-primary" onclick="reportGenerator.closeReport()">Close</button>
          </div>
        </div>
      </div>
    `;

    // Render chart if available
    if (chartData) {
      setTimeout(() => {
        this.renderChart('report-chart-container', chartData);
      }, 100);
    }

    // Store data for chart switching
    window._reportData = data;
    window._reportTableSchema = tableSchema;
    window._currentChartType = 'bar';
  }

  /**
   * Switch chart type
   */
  switchChartType(type) {
    window._currentChartType = type;
    const chartData = this.generateChartReport(
      window._reportData,
      window._reportTableSchema.fields,
      type
    );
    if (chartData) {
      this.renderChart('report-chart-container', chartData);
    }
  }

  /**
   * Export report
   */
  exportReport(report) {
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Create report container
   */
  createReportContainer() {
    const container = document.createElement('div');
    container.id = 'report-modal-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Close report
   */
  closeReport() {
    const container = document.getElementById('report-modal-container');
    if (container) {
      container.innerHTML = '';
    }
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
    delete window._reportData;
    delete window._reportTableSchema;
    delete window._currentChartType;
  }
}

// Create singleton instance
const reportGenerator = new ReportGenerator();

// Make available globally
window.reportGenerator = reportGenerator;

