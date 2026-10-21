"""
align_environmental_datasets.py — OceanRescue Dataset Integration Stage 2 Pipeline

Objective:
Align ocean currents, wave dataset, ERA5 10m wind, and GEBCO bathymetry onto a unified
$73 \\times 73$ spatial grid ($14.0^\\circ--20.0^\\circ\\text{N}, 68.0^\\circ--74.0^\\circ\\text{E}$, $0.08333333^\\circ$ spacing)
and a common 49-step 1-hourly time axis (Sept 1, 2026 00:00 to Sept 3, 2026 00:00 UTC).

Output File:
`dataset_integration/stage2/aligned_environmental_data.nc`

Safety Rules:
- Original datasets are accessed in read-only mode and NEVER modified.
- No timestamp extrapolation outside verified input bounds.
- Missing ocean/land values preserved (no silent zero-filling).
"""

import os
import sys
import numpy as np
import pandas as pd
import xarray as xr

def run_alignment_pipeline():
    # Base paths
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    stage2_dir = os.path.join(root_dir, "dataset_integration", "stage2")
    os.makedirs(stage2_dir, exist_ok=True)

    c_path = os.path.join(root_dir, "ocean currents dataset", "ocean rescue datasets ocean currents.nc")
    w_path = os.path.join(root_dir, "wave dataset", "wave dataset.nc")
    wind_path = os.path.join(root_dir, "new wind dataset", "new wind dataset.nc")
    b_path = os.path.join(root_dir, "bathymetry dataset", "gebco_2026_n20.0_s14.0_w68.0_e74.0.nc")

    print("Opening input datasets in read-only mode...")
    ds_c = xr.open_dataset(c_path)
    ds_w = xr.open_dataset(w_path)
    ds_wind = xr.open_dataset(wind_path)
    ds_b = xr.open_dataset(b_path)

    # 1. Define Target Spatial Grid (73 x 73)
    target_lat = np.linspace(14.0, 20.0, 73)
    target_lon = np.linspace(68.0, 74.0, 73)

    # 2. Define Common 1-Hourly Time Axis (49 steps: Sept 1 00:00 to Sept 3 00:00)
    time_start = "2026-09-01T00:00:00"
    time_end = "2026-09-03T00:00:00"
    target_time = pd.date_range(time_start, time_end, freq="1h")

    print(f"Target Grid: {len(target_lat)} lats x {len(target_lon)} lons")
    print(f"Target Time: {len(target_time)} 1-hourly timestamps ({target_time[0]} to {target_time[-1]})")

    # 3. Regrid Ocean Currents (uo, vo)
    print("Regridding Ocean Currents...")
    ds_c_flat = ds_c.squeeze('depth', drop=True) if 'depth' in ds_c.dims else ds_c
    c_spatial = ds_c_flat.interp(latitude=target_lat, longitude=target_lon, method="linear")
    c_full = c_spatial.interp(time=target_time, method="linear")

    uo_out = c_full['uo']
    vo_out = c_full['vo']
    uo_out.attrs = {
        "units": "m s-1",
        "long_name": "Eastward ocean current velocity",
        "source": "Copernicus Marine Ocean Currents Dataset",
        "interpolation_spatial": "Bilinear to 0.0833° target grid",
        "interpolation_temporal": "Linear 1D from 6-hourly to 1-hourly"
    }
    vo_out.attrs = {
        "units": "m s-1",
        "long_name": "Northward ocean current velocity",
        "source": "Copernicus Marine Ocean Currents Dataset",
        "interpolation_spatial": "Bilinear to 0.0833° target grid",
        "interpolation_temporal": "Linear 1D from 6-hourly to 1-hourly"
    }

    # 4. Regrid Wave Variables (VHM0, VTM10, VMDR)
    print("Regridding Wave Variables...")
    w_spatial = ds_w.interp(latitude=target_lat, longitude=target_lon, method="linear")
    w_full = w_spatial.interp(time=target_time, method="linear")

    vhm0_out = w_full['VHM0']
    vtm10_out = w_full['VTM10']

    # Handle wave direction VMDR via sin/cos decomposition to prevent 0/360 boundary wrapping
    vmdr_rad = np.radians(ds_w['VMDR'])
    sin_dir = np.sin(vmdr_rad).interp(latitude=target_lat, longitude=target_lon, method="linear").interp(time=target_time, method="linear")
    cos_dir = np.cos(vmdr_rad).interp(latitude=target_lat, longitude=target_lon, method="linear").interp(time=target_time, method="linear")
    vmdr_out = (np.degrees(np.arctan2(sin_dir, cos_dir))) % 360.0

    vhm0_out.attrs = {
        "units": "m",
        "long_name": "Spectral significant wave height (Hm0)",
        "source": "Copernicus Marine Wave Dataset",
        "interpolation_spatial": "Bilinear to 0.0833° target grid",
        "interpolation_temporal": "Linear 1D from 3-hourly to 1-hourly"
    }
    vtm10_out.attrs = {
        "units": "s",
        "long_name": "Spectral moments (-1,0) wave period (Tm-10)",
        "source": "Copernicus Marine Wave Dataset",
        "interpolation_spatial": "Bilinear to 0.0833° target grid",
        "interpolation_temporal": "Linear 1D from 3-hourly to 1-hourly"
    }
    vmdr_out.attrs = {
        "units": "degree",
        "long_name": "Mean wave direction from (Mdir)",
        "source": "Copernicus Marine Wave Dataset",
        "interpolation_spatial": "Vector sin/cos decomposition bilinear to 0.0833° target grid",
        "interpolation_temporal": "Linear 1D vector interpolation to 1-hourly"
    }

    # 5. Regrid ERA5 10m Wind (u10, v10)
    print("Regridding ERA5 10m Wind...")
    ds_wind_asc = ds_wind.sortby('latitude') if ds_wind.latitude.values[0] > ds_wind.latitude.values[-1] else ds_wind
    if 'valid_time' in ds_wind_asc.dims:
        ds_wind_asc = ds_wind_asc.rename({'valid_time': 'time'})
    ds_wind_sliced = ds_wind_asc.sel(time=slice(time_start, time_end))

    wind_spatial = ds_wind_sliced.interp(latitude=target_lat, longitude=target_lon, method="linear")

    u10_out = wind_spatial['u10']
    v10_out = wind_spatial['v10']

    u10_out.attrs = {
        "units": "m s-1",
        "long_name": "10 metre Eastward wind component (u10)",
        "source": "ECMWF ERA5 Reanalysis Dataset",
        "interpolation_spatial": "Bilinear from 0.25° to 0.0833° target grid",
        "interpolation_temporal": "Exact 1-hourly subset over verified common window"
    }
    v10_out.attrs = {
        "units": "m s-1",
        "long_name": "10 metre Northward wind component (v10)",
        "source": "ECMWF ERA5 Reanalysis Dataset",
        "interpolation_spatial": "Bilinear from 0.25° to 0.0833° target grid",
        "interpolation_temporal": "Exact 1-hourly subset over verified common window"
    }

    # 6. Regrid GEBCO Bathymetry (elevation -> water_depth, land_mask)
    print("Regridding GEBCO Bathymetry...")
    ds_b_renamed = ds_b.rename({'lat': 'latitude', 'lon': 'longitude'})
    b_spatial = ds_b_renamed['elevation'].interp(latitude=target_lat, longitude=target_lon, method="linear")

    water_depth = xr.where(b_spatial < 0, -b_spatial, np.nan)
    land_mask = xr.where(b_spatial < 0, 1, 0)

    b_spatial.attrs = {
        "units": "m",
        "long_name": "GEBCO elevation relative to sea level (positive-up)",
        "source": "GEBCO 2026 Grid",
        "interpolation_spatial": "Bilinear from 15 arc-second (~450m) to 0.0833° target grid"
    }
    water_depth.attrs = {
        "units": "m",
        "long_name": "Bathymetric ocean water depth (positive-down)",
        "source": "Derived from GEBCO 2026 Grid (-elevation where elevation < 0)",
        "interpolation_spatial": "Bilinear regridded to 0.0833° target grid"
    }
    land_mask.attrs = {
        "units": "1",
        "long_name": "Binary land-ocean mask (1=ocean, 0=land)",
        "source": "Derived from GEBCO 2026 elevation sign (< 0)"
    }

    # 7. Assemble NetCDF Output
    print("Saving output NetCDF dataset...")
    aligned_ds = xr.Dataset(
        data_vars={
            "uo": uo_out,
            "vo": vo_out,
            "u10": u10_out,
            "v10": v10_out,
            "VHM0": vhm0_out,
            "VTM10": vtm10_out,
            "VMDR": vmdr_out,
            "elevation": b_spatial,
            "water_depth": water_depth,
            "land_mask": land_mask
        },
        coords={
            "time": target_time,
            "latitude": target_lat,
            "longitude": target_lon
        },
        attrs={
            "title": "OceanRescue Aligned Environmental Dataset (Stage 2 Output)",
            "project": "OceanRescue: AI-Driven Geospatial Intelligence for ALDFG",
            "study_region": "Arabian Sea (14-20N, 68-74E)",
            "spatial_resolution": "0.08333333 degree (~9 km, 73 x 73 grid)",
            "temporal_resolution": "1-hourly (49 timestamps from 2026-09-01 00:00 to 2026-09-03 00:00)",
            "processing_stage": "Stage 2 Grid Resampling and Temporal Alignment",
            "processing_date": "2026-10-10",
            "author": "OceanRescue Pair Programming Pipeline"
        }
    )

    out_file = os.path.join(stage2_dir, "aligned_environmental_data.nc")
    aligned_ds.to_netcdf(out_file)
    print(f"Alignment pipeline completed successfully: {out_file}")

if __name__ == "__main__":
    run_alignment_pipeline()
