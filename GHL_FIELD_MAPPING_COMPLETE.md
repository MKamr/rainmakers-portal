# Complete GHL Field Mapping - Based on Actual Custom Fields

This mapping is based on the actual custom fields fetched from your GHL account on 2025-09-15.

## Contact-Level Fields ({{ contact.field_name }})

### Property Details
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| propertyAddress | Property Address | contact.property_address | 630 | TEXT |
| propertyAPN | Property APN | contact.property_apn | 700 | TEXT |
| propertyType | Property Type | contact.property_type | 813 | TEXT |
| propertyVintage | Property Vintage | contact.property_vintage | 686 | TEXT |
| propertyStatus | Property Status | contact.property_status | 766 | TEXT |
| numberOfUnits | # of Units | contact._of_units | 1136 | TEXT |
| purchasePrice | Purchase Price | contact.purchase_price | 973 | TEXT |
| originalPurchaseDate | Original Purchase Date | contact.original_purchase_date | 887 | TEXT |
| occupancy | Occupancy | contact.occupancy | 973 | TEXT |
| occupancyPercentage | Occupancy % | contact.occupancy_ | 945 | TEXT |
| appraisedValue | Appraised Value | contact.appraised_value | 1106 | TEXT |
| debitYield | Debit Yield | contact.debit_yield | 1150 | TEXT |
| propertyCapEx | Property CapEx | contact.property_capex | 1076 | TEXT |
| costBasis | Cost Basis | contact.cost_basis | 1043 | TEXT |
| managementEntity | Management Entity | contact.management_entity | 738 | TEXT |

### Loan Details
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| borrowingEntity | Borrowing Entity | contact.borrowing_entity | 785 | TEXT |
| lender | Lender | contact.lender | 752 | TEXT |
| loanAmount | Loan Amount | contact.loan_amount | 672 | TEXT |
| unpaidPrincipalBalance | Unpaid Principal Balance | contact.unpaid_principal_balance | 658 | TEXT |
| dealType | Deal Type | contact.deal_type | 1057 | TEXT |
| investmentType | Investment Type | contact.investment_type | 714 | TEXT |
| ltv | LTV | contact.ltv | 987 | TEXT |
| dscr | DSCR | contact.dscr | 1015 | TEXT |
| hcOriginationFee | HC Origination Fee | contact.hc_origination_fee | 644 | TEXT |
| ysp | YSP | contact.ysp | 848 | TEXT |
| processingFee | Processing Fee | contact.processing_fee | 1029 | TEXT |
| lenderOriginationFee | Lender Origination Fee | contact.lender_origination_fee | 1001 | TEXT |
| term | Term | contact.term | 915 | TEXT |
| index | Index | contact.index | 862 | TEXT |
| indexPercentage | Index % | contact.index_ | 1248 | TEXT |
| spreadPercentage | Spread % | contact.spread_ | 1261 | TEXT |
| ratePercentage | Rate % | contact.rate_ | 1274 | TEXT |
| probabilityPercentage | Probability (%) | contact.probability_ | 1300 | TEXT |
| amortization | Amortization | contact.amortization | 1313 | TEXT |
| exitFee | Exit Fee | contact.exit_fee | 1222 | TEXT |
| prepaymentPenalty | Pre-Payment Penalty | contact.prepayment_penalty | 1339 | TEXT |
| recourse | Recourse | contact.recourse | 1204 | TEXT |
| fixedMaturityDate | Fixed Maturity Date | contact.fixed_maturity_date | 1235 | TEXT |
| floatingMaturityDate | Floating Maturity Date | contact.floating_maturity_date | 1326 | TEXT |

### Sponsor Details
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| sponsorName | Sponsor Name | contact.sponsor_name | 616 | TEXT |
| sponsorNetWorth | Sponsor Net Worth | contact.sponsor_net_worth | 799 | TEXT |
| sponsorLiquidity | Sponsor Liquidity | contact.sponsor_liquidity | 901 | TEXT |

### Application Details
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| applicationDate | Application Date | contact.application_date | 1164 | TEXT |
| applicationDealType | Application Deal Type | contact.application_deal_type | 67 | TEXT |
| applicationPropertyType | Application Property Type | contact.application_property_type | 326 | TEXT |
| applicationPropertyAddress | Application Property Address | contact.application_property_address | 11 | TEXT |
| applicationPropertyVintage | Application Property Vintage | contact.application_property_vintage | 375 | TEXT |
| applicationSponsorNetWorth | Application Sponsor Net Worth | contact.application_sponsor_net_worth | 389 | TEXT |
| applicationSponsorLiquidity | Application Sponsor Liquidity | contact.application_sponsor_liquidity | 257 | TEXT |
| applicationLoanRequest | Application Loan Request | contact.application_loan_request | 86 | TEXT |
| applicationDocumentUpload | Application Document Upload | contact.application_document_upload | 128 | TEXT |
| applicationAdditionalInformation | Application Any Additional Information | contact.application_additional_information | 440 | TEXT |

### Lead Information
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| leadPropertyType | Lead Property Type | contact.lead_property_type | 312 | TEXT |
| leadPropertyAddress | Lead Property Address | contact.lead_property_address | 243 | TEXT |
| leadPropertyCity | Lead Property City | contact.lead_property_city | 187 | TEXT |
| leadPropertyState | Lead Property State | contact.lead_property_state | 25 | TEXT |
| leadPropertyPurchaseDate | Lead Property Purchase Date | contact.lead_property_purchase_date | 215 | TEXT |
| leadPropertyPurchasePrice | Lead Property Purchase Price | contact.lead_property_purchase_price | 516 | TEXT |
| leadPropertyNoOfUnits | Lead Property No. of Units | contact.lead_property_no_of_units | 586 | TEXT |

### AI-Generated Fields
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| aiStatus | AI Status | contact.ai_status | 271 | TEXT |
| aiTypeOfLoan | AI Type of Loan | contact.ai_type_of_loan | 454 | TEXT |
| aiPropertyType | AI Property Type | contact.ai_property_type | 558 | TEXT |
| aiPropertyLocation | AI Property Location | contact.ai_property_location | 572 | TEXT |
| aiLoanAmount | AI Loan Amount | contact.ai_loan_amount | 600 | TEXT |

### Other Fields
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| discordUsername | Discord Username | contact.discord_username | 530 | TEXT |
| applicationSubmittedBy | Application Submitted By | contact.application_submitted_by | 544 | TEXT |
| callCenterEmployee | Call Center Employee | contact.call_center_employee | 1191 | TEXT |
| mondaycomItemId | Monday.com Item ID | contact.mondaycom_item_id | 1287 | TEXT |
| callRecordings | Call Recordings | contact.call_recordings | 1090 | TEXT |
| fileUpload | File Upload | contact.file_upload | 1120 | TEXT |

## Opportunity-Level Fields ({{ opportunity.field_name }})

### Opportunity Details
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| opportunityName | Opportunity Name | opportunity.name | - | TEXT |
| pipeline | Pipeline | opportunity.pipeline_id | - | TEXT |
| stage | Stage | opportunity.pipeline_stage_id | - | TEXT |
| status | Status | opportunity.status | - | TEXT |
| leadValue | Lead Value | opportunity.monetary_value | - | TEXT |
| opportunityOwner | Opportunity Owner | opportunity.assigned_to | - | TEXT |
| opportunitySource | Opportunity Source | opportunity.source | - | TEXT |
| lostReason | Lost Reason | opportunity.lost_reason | - | TEXT |
| closeDate | Close Date | opportunity.close_date | 1178 | TEXT |

### Property Details (Opportunity Level)
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| propertyAddress | Property Address | opportunity.property_address | 630 | TEXT |
| propertyAPN | Property APN | opportunity.property_apn | 700 | TEXT |
| propertyType | Property Type | opportunity.property_type | 813 | TEXT |
| propertyVintage | Property Vintage | opportunity.property_vintage | 686 | TEXT |
| propertyStatus | Property Status | opportunity.property_status | 766 | TEXT |
| numberOfUnits | # of Units | opportunity._of_units | 1136 | TEXT |
| purchasePrice | Purchase Price | opportunity.purchase_price | 973 | TEXT |
| originalPurchaseDate | Original Purchase Date | opportunity.original_purchase_date | 887 | TEXT |
| occupancy | Occupancy | opportunity.occupancy | 973 | TEXT |
| occupancyPercentage | Occupancy % | opportunity.occupancy_ | 945 | TEXT |
| appraisedValue | Appraised Value | opportunity.appraised_value | 1106 | TEXT |
| debitYield | Debit Yield | opportunity.debit_yield | 1150 | TEXT |
| propertyCapEx | Property CapEx | opportunity.property_capex | 1076 | TEXT |
| costBasis | Cost Basis | opportunity.cost_basis | 1043 | TEXT |
| managementEntity | Management Entity | opportunity.management_entity | 738 | TEXT |

### Loan Details (Opportunity Level)
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| borrowingEntity | Borrowing Entity | opportunity.borrowing_entity | 785 | TEXT |
| lender | Lender | opportunity.lender | 752 | TEXT |
| loanAmount | Loan Amount | opportunity.loan_amount | 672 | TEXT |
| unpaidPrincipalBalance | Unpaid Principal Balance | opportunity.unpaid_principal_balance | 658 | TEXT |
| dealType | Deal Type | opportunity.deal_type | 1057 | TEXT |
| investmentType | Investment Type | opportunity.investment_type | 714 | TEXT |
| ltv | LTV | opportunity.ltv | 987 | TEXT |
| dscr | DSCR | opportunity.dscr | 1015 | TEXT |
| hcOriginationFee | HC Origination Fee | opportunity.hc_origination_fee | 644 | TEXT |
| ysp | YSP | opportunity.ysp | 848 | TEXT |
| processingFee | Processing Fee | opportunity.processing_fee | 1029 | TEXT |
| lenderOriginationFee | Lender Origination Fee | opportunity.lender_origination_fee | 1001 | TEXT |
| term | Term | opportunity.term | 915 | TEXT |
| index | Index | opportunity.index | 862 | TEXT |
| indexPercentage | Index % | opportunity.index_ | 1248 | TEXT |
| spreadPercentage | Spread % | opportunity.spread_ | 1261 | TEXT |
| ratePercentage | Rate % | opportunity.rate_ | 1274 | TEXT |
| probabilityPercentage | Probability (%) | opportunity.probability_ | 1300 | TEXT |
| amortization | Amortization | opportunity.amortization | 1313 | TEXT |
| exitFee | Exit Fee | opportunity.exit_fee | 1222 | TEXT |
| prepaymentPenalty | Pre-Payment Penalty | opportunity.prepayment_penalty | 1339 | TEXT |
| recourse | Recourse | opportunity.recourse | 1204 | TEXT |
| fixedMaturityDate | Fixed Maturity Date | opportunity.fixed_maturity_date | 1235 | TEXT |
| floatingMaturityDate | Floating Maturity Date | opportunity.floating_maturity_date | 1326 | TEXT |

### Sponsor Details (Opportunity Level)
| Portal Field | GHL Field Name | GHL Field Key | GHL Field ID | Data Type |
|--------------|----------------|---------------|--------------|-----------|
| sponsorName | Sponsor Name | opportunity.sponsor_name | 616 | TEXT |
| sponsorNetWorth | Sponsor Net Worth | opportunity.sponsor_net_worth | 799 | TEXT |
| sponsorLiquidity | Sponsor Liquidity | opportunity.sponsor_liquidity | 901 | TEXT |

## Field Mapping Notes

1. **Contact vs Opportunity Fields**: Many fields exist at both contact and opportunity levels. The opportunity-level fields take precedence for deal synchronization.

2. **Data Types**: Most fields are TEXT type, with some LARGE_TEXT for longer content.

3. **Field Keys**: The fieldKey format is `{model}.{field_name}` where model is either "contact" or "opportunity".

4. **Required Fields**: Standard GHL fields like `name`, `pipeline_id`, `status` are not in custom fields but are required for opportunity creation.

5. **Synchronization Priority**: 
   - Opportunity-level fields are used for deal synchronization
   - Contact-level fields are used for contact synchronization
   - If a field exists at both levels, opportunity-level takes precedence

## Next Steps

1. Update the backend field mapping in `deals.ts` to use these exact field keys
2. Update the frontend forms to use the correct field names
3. Test synchronization in both directions (portal → GHL and GHL → portal)
4. Ensure all field types are handled correctly (TEXT, LARGE_TEXT, etc.)



