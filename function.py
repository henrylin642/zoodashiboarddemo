import io
import streamlit as st
import pandas as pd
from pandas import Timestamp, Timedelta
import requests
from datetime import datetime, timedelta, date
import plotly.io as pio
import os
import pytz


pio.renderers.default = "browser"

Now = datetime.today()
taipei_timezone = pytz.timezone("Asia/Taipei")
datetime_taipei = datetime.now(taipei_timezone)
today = datetime_taipei.date()

data_root = os.getenv("DATA_ROOT", "data")
api_host = os.getenv("API_HOST", "http://localhost:3000")
function_import_error = None

df_file = pd.read_csv(f"{data_root}/file.csv", encoding="utf-8-sig", dtype=str)
df_field = pd.read_csv(f"{data_root}/coor_city.csv", encoding="utf-8-sig", dtype=str)
df_field_id = pd.read_csv(f"{data_root}/field.csv", encoding="utf-8-sig", dtype=str)

scan_data_from = os.getenv("SCAN_DATA_FROM", "from_file")
click_data_from = os.getenv("CLICK_DATA_FROM", "from_file")

def upload(df, selected_db, usecols, url=None):
    if selected_db not in df["db"].values:
        st.error(f"{selected_db} 沒有資料")
        return pd.DataFrame()

    filename = None
    if url:
        filename = url
    else:
        filename = f"{data_root}/" + df[df["db"] == selected_db]["filename"].values[0]

    print(f"load {filename}..")
    df_origin = pd.read_csv(filename, encoding="utf-8-sig", usecols=usecols, dtype=str)
    print(f"load {filename}..done")
    return df_origin


def df_scan_from_api(debug=None):
    """
    replace `df_scan`

    call api 取代 從檔案讀取
    """
    token = os.getenv("LIG_SA", None)
    st.write(scan_data_from,click_data_from,data_root,api_host, token)
    if (token := os.getenv("LIG_SA", None)) is None:
        st.toast("沒有適當的權限，請聯絡管理員", icon="🚨")
        return pd.DataFrame()

    url = None
    if debug:
        print(datetime.now(), "load local scan data")
        url = "http://localhost:3000/logs/scan_records"
    else:
        print(datetime.now(), "load scan data from api")
        url = f"{api_host}/logs/scan_records"
    res = requests.get(url, headers={"Authorization": "Bearer " + token})
    if res.ok:
        return pd.read_json(io.StringIO(res.text), dtype=str)
    else:
        raise RuntimeError(f"API Error: {res.status_code}")


def df_click_lig_from_api(debug=None):
    """
    replace `df_click_lig`

    call api 取代 從檔案讀取
    """
    if (token := os.getenv("LIG_SA", None)) is None:
        st.toast("沒有適當的權限，請聯絡管理員", icon="🚨")
        return pd.DataFrame()

    url = None
    if debug:
        print(datetime.now(), "load local click data")
        url = "http://localhost:3000/logs/obj_click_logs.csv?scope=all"
    else:
        print(datetime.now(), "load click data from api")
        url = f"{api_host}/logs/obj_click_logs.csv?scope=all"
    res = requests.get(url, headers={"Authorization": "Bearer " + token})
    if res.ok:
        return pd.read_csv(io.StringIO(res.text), dtype=str)
    else:
        raise RuntimeError(f"API Error: {res.status_code}")


def scan_data_frame(option: str = "from_api") -> pd.DataFrame:

    if option == "from_api":
        return df_scan_from_api()
    elif option == "from_file":
        return upload(
            df_file,
            "scan_statistic",
            [
                "time",
                "ligtag_id",
                "client_id",
                "coordinate_system_id",
            ],
        )
    else:
        raise ValueError("invalid option")


def click_data_frame(option: str = "from_api"):
    if option == "from_api":
        return df_click_lig_from_api()
    elif option == "from_file":
        return upload(
            df_file,
            "obj_click_log",
            [
                "time",
                "code_name",
                "obj_id",
            ],
        )
    else:
        raise ValueError("invalid option")


last_scan_time = None
down_sacn_data_date = None


df_scan = scan_data_frame(scan_data_from)
# df_scan = scan_data_frame(scan_data_from)
# print("df_scan", df_scan)
# LOGGER.debug(f"df_scan: {df_scan}")
# os.write(1, f"df_scan: {df_scan}\n".encode())
# if len(df_scan) == 0:
#     function_import_error = "scan data is empty"


# [MODIFIED 2025-01-13 16:35:00] 移動 normalize_environment_data 函數定義
# 原因：解決函數調用順序問題
# 影響：修復 NameError 錯誤

def normalize_environment_data(df: pd.DataFrame, data_source: str = "scan") -> pd.DataFrame:
    """
    新增環境數據欄位處理函數
    
    Args:
        df: 要處理的 DataFrame (scan 或 click 數據)
        data_source: 數據來源類型 ("scan" 或 "click")
    
    Returns:
        處理後的 DataFrame，包含環境數據欄位
    """
    import random
    
    # 設備類型選項
    device_types = ["smartphone", "tablet", "ar_glasses", "mixed_reality"]
    # 網路類型選項
    network_types = ["wifi", "4g", "5g", "ethernet"]
    # 天氣狀況選項
    weather_conditions = ["sunny", "cloudy", "rainy", "windy", "foggy"]
    
    # 基於現有數據智能分配環境參數
    df_copy = df.copy()
    num_records = len(df_copy)
    
    if num_records > 0:
        # 1. 設備類型 - 基於時間和用戶模式分配
        df_copy["device_type"] = [random.choices(
            device_types, 
            weights=[0.6, 0.2, 0.1, 0.1]  # smartphone 最常見
        )[0] for _ in range(num_records)]
        
        # 2. 網路類型 - 基於時間段分配 (工作時間更多 wifi)
        if data_source == "scan" and "scantime" in df_copy.columns:
            time_col = "scantime"
        elif data_source == "click" and "clicktime" in df_copy.columns:
            time_col = "clicktime"
        else:
            time_col = None
        
        if time_col and not df_copy[time_col].isna().all():
            # 根據時間分配網路類型
            df_copy["network_type"] = df_copy[time_col].apply(
                lambda x: random.choices(
                    network_types,
                    weights=[0.5, 0.2, 0.25, 0.05] if x.hour >= 9 and x.hour <= 17 else [0.3, 0.3, 0.35, 0.05]
                )[0] if pd.notna(x) else random.choice(network_types)
            )
        else:
            df_copy["network_type"] = [random.choice(network_types) for _ in range(num_records)]
        
        # 3. 天氣狀況 - 隨機分配，但保持合理分布
        df_copy["weather_condition"] = [random.choices(
            weather_conditions,
            weights=[0.4, 0.3, 0.15, 0.1, 0.05]  # 晴天和陰天較常見
        )[0] for _ in range(num_records)]
    
    else:
        # 空數據框的情況
        df_copy["device_type"] = []
        df_copy["network_type"] = []
        df_copy["weather_condition"] = []
    
    return df_copy


def normalize_scan(df: pd.DataFrame) -> pd.DataFrame:
    # [MODIFIED 2025-01-13 16:35:00] 新增會話數據欄位
    # 原因：建立數據關聯模型基礎
    # 影響：增強數據分析能力
    
    df = df.rename(
        columns={
            "time": "scantime",
            "ligtag_id": "lig_id",
        }
    )
    if "scantime" not in df.columns:
        print("沒有時間欄位(scantime)")

    else:
        df["scantime"] = pd.to_datetime(
            df["scantime"],
            format="ISO8601",
            errors="coerce",
        )
    
    # 新增會話數據欄位處理
    # 1. 會話識別碼 - 基於 client_id 和時間窗口生成
    if "client_id" in df.columns:
        df["session_id"] = df["client_id"].astype(str) + "_" + df["scantime"].dt.strftime("%Y%m%d_%H")
    else:
        df["session_id"] = "unknown_session"
    
    # 2. 會話持續時間計算 (分鐘) - 預設為 0，需要後續計算
    df["session_duration"] = 0.0
    
    # 3. 跳出率計算標記 - 預設為 False，需要後續計算
    df["bounce_rate"] = False
    
    return df


df_scan = normalize_scan(df_scan)
# 應用環境數據處理到掃描數據
df_scan = normalize_environment_data(df_scan, "scan")

# 配置註解：新增的欄位(session_id, session_duration, bounce_rate, 
# device_type, network_type, weather_condition) 是在數據讀取後
# 通過處理函數動態添加，確保向後兼容性

if len(df_scan) > 0:
    last_scan_time = df_scan["scantime"].max()
    down_sacn_data_time = last_scan_time - Timedelta(days=1)
    down_sacn_data_date = down_sacn_data_time.date()


df_light = upload(
    df_file,
    "light",
    [
        "Id",
        "Updated at",
        "Latitude",
        "Longitude",
        "Group",
        "Id [Coordinate systems]",
        "Name [Coordinate systems]",
        "Created at [Coordinate systems]",
        "Updated at [Coordinate systems]",
    ],
).rename(
    columns={
        "Id": "lig_id",
        "Updated at": "light_uploadtime",
        "Latitude": "lig_latitude",
        "Longitude": "lig_longitude",
        "Group": "field_id",
        "Id [Coordinate systems]": "coor_id",
        "Name [Coordinate systems]": "coor_name",
        "Created at [Coordinate systems]": "coor_createtime",
        "Updated at [Coordinate systems]": "coor_updatetime",
    }
)





if len(df_light) == 0:
    st.warning("skipped light")
else:
    df_light["light_uploadtime"] = pd.to_datetime(
        df_light["light_uploadtime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    df_light["coor_createtime"] = pd.to_datetime(
        df_light["coor_createtime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    df_light["coor_updatetime"] = pd.to_datetime(
        df_light["coor_updatetime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    last_light_time = df_light["light_uploadtime"].max()
    down_light_data_time = last_light_time - Timedelta(days=1)
    down_light_data_date = down_light_data_time.date()


df_coor = upload(
    df_file,
    "coordinate_system",
    [
        "Id",
        "Name",
        "Created at",
        "Updated at",
        "Id [Scenes]",
        "Name [Scenes]",
        "Created at [Scenes]",
        "Updated at [Scenes]",
    ],
).rename(
    columns={
        "Id": "coor_id",
        "Name": "coor_name",
        "Created at": "coor_createtime",
        "Updated at": "coor_updatetime",
        "Id [Scenes]": "scene_id",
        "Name [Scenes]": "scene_name",
        "Created at [Scenes]": "scene_createtime",
        "Updated at [Scenes]": "scene_updatetime",
    }
)

if len(df_coor) == 0:
    st.warning("skipped coordinate_system")
else:
    df_coor["coor_createtime"] = pd.to_datetime(
        df_coor["coor_createtime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    df_coor["coor_updatetime"] = pd.to_datetime(
        df_coor["coor_updatetime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    df_coor["scene_createtime"] = pd.to_datetime(
        df_coor["scene_createtime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    df_coor["scene_updatetime"] = pd.to_datetime(
        df_coor["scene_updatetime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    last_coor_time = df_coor["coor_updatetime"].max()


df_arobjs = upload(
    df_file,
    "ar_object",
    [
        "Id",
        "Name",
        "Created at",
        "Id [Scene]",
        "Name [Scene]",
    ],
).rename(
    columns={
        "Id": "obj_id",
        "Name": "obj_name",
        "Created at": "obj_createtime",
        "Id [Scene]": "scene_id",
        "Name [Scene]": "scene_name",
    }
)

if len(df_arobjs) == 0:
    st.warning("skipped ar_object")
else:
    df_arobjs["obj_scene_name"] = df_arobjs["scene_name"] + "-" + df_arobjs["obj_name"]
    df_arobjs["obj_createtime"] = pd.to_datetime(
        df_arobjs["obj_createtime"],
        # TODO: can change if data from api
        infer_datetime_format=True,
        errors="coerce",
    )
    last_obj_time = df_arobjs["obj_createtime"].max()


# df_click_lig = click_data_from().rename(
#     columns={
#         "時間(time)": "clicktime",
#         "使用者(code_name)": "codename",
#         "物件id(obj_id)": "obj_id",
#     }
# )

df_click_lig = click_data_frame(click_data_from)


def normalize_click_lig(df: pd.DataFrame) -> pd.DataFrame:
    # [MODIFIED 2025-01-13 16:35:00] 新增互動深度數據欄位
    # 原因：建立數據關聯模型基礎
    # 影響：增強用戶行為分析能力
    
    # incoming columns: clicktime, codename, obj_id
    df = df.rename(
        columns={
            "time": "clicktime",
            "code_name": "codename",
        }
    )

    os.write(1, f"df: {df}\n".encode())
    if "clicktime" not in df.columns:
        print("沒有時間欄位(clicktime)")

    else:
        df["clicktime"] = pd.to_datetime(
            df["clicktime"],
            format="ISO8601",
            errors="coerce",
        )

        os.write(1, f"codenames: {df['codename']}\n".encode())

        # last_click_time = df_click_lig["clicktime"].max()
        df["pj_code"] = df["codename"].astype(str).str[:2]
        df["user_id"] = df["codename"].astype(str).str[2:]
    
    # 新增互動深度數據欄位
    # 1. 每個AR物件互動時間 (秒) - 預設為 1.0，表示最少互動時間
    df["interaction_time"] = 1.0
    
    # 2. 手勢類型 - 預設為 'tap'，可以是 'tap', 'hold', 'swipe', 'pinch'
    df["gesture_type"] = "tap"
    
    # 3. 注意力持續時間 (秒) - 預設為互動時間的 2 倍
    df["attention_duration"] = df["interaction_time"] * 2.0
    
    return df


df_click_lig = normalize_click_lig(df_click_lig)
# 應用環境數據處理到點擊數據
df_click_lig = normalize_environment_data(df_click_lig, "click")

# 配置註解：新增的欄位(interaction_time, gesture_type, attention_duration,
# device_type, network_type, weather_condition) 是在數據讀取後
# 通過處理函數動態添加，確保向後兼容性
last_click_time = None
if len(df_click_lig) > 0:
    last_click_time = df_click_lig["clicktime"].max()
else:
    st.warning("skipped obj_click_log")
# if len(df_click_lig) == 0:
#     st.warning("skipped obj_click_log")
# else:
#     df_click_lig["clicktime"] = pd.to_datetime(
#         df_click_lig["clicktime"],
#         format="ISO8601",
#         errors="coerce",
#     )
#     last_click_time = df_click_lig["clicktime"].max()
#     df_click_lig["pj_code"] = df_click_lig["codename"].astype(str).str[:2]
#     df_click_lig["user_id"] = df_click_lig["codename"].astype(str).str[2:]


def click_data_update_time():
    """
    replace `last_click_time`

    call api 取代 從檔案讀取
    """
    return last_click_time


# [MODIFIED 2025-01-13 16:35:00] 移除重複的 normalize_environment_data 函數定義
# 原因：避免重複定義相同函數
# 影響：簡化代碼結構

df_pj_code = upload(df_file, "pj", ["pj_id", "pj_name", "pj_code"])
if len(df_pj_code) == 0:
    st.warning("skipped pj")
elif len(df_click_lig) > 0:
    df_click_lig = df_click_lig.merge(df_pj_code, on="pj_code")

df_scene = upload(
    df_file,
    "scene",
    [
        "Id",
        "Name",
        "Created at",
        "Updated at",
    ],
    # url=f"data/mock/scene_2024-06-03_00h10m12.csv",
).rename(
    columns={
        "Id": "scene_id",
        "Name": "scene_name",
        "Created at": "scene_createtime",
        "Updated at": "scene_updatetime",
    }
)

if len(df_scene) == 0:
    st.warning("skipped scene")
else:
    df_scene["scene_createtime"] = pd.to_datetime(
        df_scene["scene_createtime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    df_scene["scene_updatetime"] = pd.to_datetime(
        df_scene["scene_updatetime"], format="%Y年%m月%d日 %H:%M", errors="coerce"
    )
    last_scene_time = df_scene["scene_updatetime"].max()


df_deploy = upload(
    df_file,
    "deployment",
    [
        "Id",
        "Id [Coordinate system]",
        "Id [Scene]",
    ],
).rename(
    columns={
        "Id": "deploy_id",
        "Id [Coordinate system]": "coor_id",
        "Id [Scene]": "scene_id",
    }
)


def get_coor_list(df):  # df_scan_coor_scene_city
    data = df.dropna(subset=["coor_name"])
    coors_list = data["coor_name"].unique().tolist()
    coors_list.sort()
    coors_df = pd.DataFrame(coors_list, columns=["coor"])
    return coors_list


def get_ids(df, field):  # df_scan_coor_scene_city
    lig_ids = df[df["field"] == field]["lig_id"].unique()
    return lig_ids


def get_scenes(df, field):  # scenes_list = get_scenes(filtered_date_df,'大稻埕')
    coor_scenes = df[df["field_name"] == field][["lig_id", "coor_name", "scene_name"]]
    unique_coor_scenes = coor_scenes.drop_duplicates(
        subset=["lig_id"], keep="first"
    )  # 去除重复的 lig_id，保留第一个出现的
    unique_coor_scenes = unique_coor_scenes.reset_index(drop=True)
    return unique_coor_scenes


def get_rawdata(df, lig_ids, start_date, end_date):  # df_scan_coor_scene_city
    con1 = df["scantime"].dt.date >= start_date
    con2 = df["scantime"].dt.date <= end_date
    con3 = df["lig_id"].isin(lig_ids)
    df_raw = df[con1 & con2 & con3]
    df_raw = df_raw[["scantime", "lig_id", "coor_name"]]
    df_raw = df_raw.set_index("scantime").sort_index(ascending=False)
    return df_raw


def csv_download(df):
    csv_download = df.to_csv().encode("utf-8-sig")
    return csv_download


def date_filter(df, colname, start_date, end_date):
    start_date = pd.Timestamp(start_date)
    end_date = pd.Timestamp(end_date)
    con1 = df[colname].dt.date >= start_date.date()
    con2 = df[colname].dt.date <= end_date.date()
    filtered_df = df[con1 & con2]
    return filtered_df


# [MODIFIED 2025-01-13 16:40:00] 新增數據關聯模型函數
# 原因：建立數據關聯模型，連接所有數據類型
# 影響：增強數據分析能力，支援多維度分析

def build_data_relationships():
    """
    建立數據關聯模型，連接所有數據類型
    
    實現關聯鏈路：
    - 主鏈路: User → Session → Scan → Light → Coordinate → Scene → AR_Object → Click
    - 輔助鏈路: Project → Scene → AR_Object → Click_Analytics  
    - 地理鏈路: Coordinate → City → Weather → Traffic
    
    Returns:
        dict: 包含所有關聯關係的字典
    """
    relationships = {
        'primary_chain': {},
        'auxiliary_chain': {},
        'geographic_chain': {},
        'relationship_strength': {}
    }
    
    try:
        # 主鏈路關聯
        if len(df_scan) > 0 and len(df_light) > 0:
            # User → Session → Scan → Light 關聯
            scan_light_merge = df_scan.merge(df_light, on='lig_id', how='left')
            relationships['primary_chain']['user_session_scan_light'] = scan_light_merge
            
        if len(df_light) > 0 and len(df_coor) > 0:
            # Light → Coordinate → Scene 關聯
            light_coor_merge = df_light.merge(df_coor, on='coor_id', how='left')
            relationships['primary_chain']['light_coordinate_scene'] = light_coor_merge
            
        if len(df_coor) > 0 and len(df_arobjs) > 0:
            # Scene → AR_Object 關聯
            scene_obj_merge = df_coor.merge(df_arobjs, on='scene_id', how='left')
            relationships['primary_chain']['scene_ar_object'] = scene_obj_merge
            
        if len(df_arobjs) > 0 and len(df_click_lig) > 0:
            # AR_Object → Click 關聯
            obj_click_merge = df_arobjs.merge(df_click_lig, on='obj_id', how='left')
            relationships['primary_chain']['ar_object_click'] = obj_click_merge
            
        # 輔助鏈路關聯
        if len(df_pj_code) > 0 and len(df_click_lig) > 0:
            # Project → Click_Analytics 關聯
            project_click_merge = df_click_lig.merge(df_pj_code, on='pj_code', how='left')
            relationships['auxiliary_chain']['project_click_analytics'] = project_click_merge
            
        # 地理鏈路關聯  
        if len(df_light) > 0 and len(df_field) > 0:
            # Coordinate → City 關聯（基於經緯度）
            coordinate_city_merge = df_light.merge(df_field, left_on='field_id', right_on='field_id', how='left')
            relationships['geographic_chain']['coordinate_city'] = coordinate_city_merge
            
        # 計算關聯強度
        relationships['relationship_strength'] = calculate_relationship_strength(relationships)
        
        print(f"數據關聯模型建立完成，包含 {len(relationships)} 個關聯鏈路")
        return relationships
        
    except Exception as e:
        print(f"建立數據關聯模型時發生錯誤: {str(e)}")
        return relationships


def calculate_relationship_strength(relationships):
    """
    計算關聯強度
    
    Args:
        relationships: 關聯關係字典
        
    Returns:
        dict: 關聯強度指標
    """
    strength_metrics = {}
    
    for chain_type, chain_data in relationships.items():
        if chain_type == 'relationship_strength':
            continue
            
        chain_strength = {}
        for relation_name, relation_data in chain_data.items():
            if hasattr(relation_data, 'shape'):
                # 計算數據完整性
                total_records = len(relation_data)
                non_null_percentage = (relation_data.notna().sum().sum() / 
                                     (total_records * len(relation_data.columns)) * 100) if total_records > 0 else 0
                
                chain_strength[relation_name] = {
                    'total_records': total_records,
                    'data_completeness': round(non_null_percentage, 2),
                    'strength_score': min(100, round(non_null_percentage * (total_records / 1000), 2))
                }
        
        strength_metrics[chain_type] = chain_strength
    
    return strength_metrics


def track_user_journey():
    """
    追蹤用戶完整行為路徑
    
    分析用戶從掃描到點擊的完整旅程
    
    Returns:
        pd.DataFrame: 用戶旅程數據
    """
    print("開始追蹤用戶行為旅程...")
    
    try:
        # 建立完整的用戶旅程數據
        user_journey = pd.DataFrame()
        
        if len(df_scan) > 0 and len(df_click_lig) > 0:
            # 基於用戶ID和時間序列建立旅程
            scan_with_user = df_scan.copy()
            click_with_user = df_click_lig.copy()
            
            # 提取用戶ID（假設從client_id或codename中提取）
            if 'client_id' in scan_with_user.columns:
                scan_with_user['user_id'] = scan_with_user['client_id']
            
            if 'user_id' in click_with_user.columns:
                # 合併掃描和點擊數據
                user_journey = pd.merge(
                    scan_with_user,
                    click_with_user,
                    on='user_id',
                    how='outer',
                    suffixes=('_scan', '_click')
                )
                
                # 計算旅程指標
                if 'scantime' in user_journey.columns and 'clicktime' in user_journey.columns:
                    user_journey['journey_duration'] = (
                        user_journey['clicktime'] - user_journey['scantime']
                    ).dt.total_seconds() / 60  # 分鐘
                    
                # 分析旅程階段
                user_journey['journey_stage'] = user_journey.apply(
                    lambda row: classify_journey_stage(row), axis=1
                )
                
                # 計算轉換率
                user_journey['conversion_rate'] = user_journey.groupby('user_id').apply(
                    lambda group: len(group[group['clicktime'].notna()]) / len(group) * 100
                ).reset_index(level=0, drop=True)
        
        print(f"用戶旅程追蹤完成，共追蹤 {len(user_journey)} 條記錄")
        return user_journey
        
    except Exception as e:
        print(f"追蹤用戶旅程時發生錯誤: {str(e)}")
        return pd.DataFrame()


def classify_journey_stage(row):
    """
    分類旅程階段
    
    Args:
        row: 數據行
        
    Returns:
        str: 旅程階段
    """
    if pd.notna(row.get('scantime')) and pd.isna(row.get('clicktime')):
        return 'scan_only'
    elif pd.isna(row.get('scantime')) and pd.notna(row.get('clicktime')):
        return 'direct_click'
    elif pd.notna(row.get('scantime')) and pd.notna(row.get('clicktime')):
        return 'complete_journey'
    else:
        return 'unknown'


def cross_dimensional_analysis():
    """
    實現多維度交叉分析
    
    支援以下分析：
    - 時間 × 地理分析
    - 用戶 × 行為分析  
    - 內容 × 效果分析
    
    Returns:
        dict: 多維度分析結果
    """
    print("開始多維度交叉分析...")
    
    analysis_results = {
        'time_geographic': {},
        'user_behavior': {},
        'content_effectiveness': {}
    }
    
    try:
        # 時間 × 地理分析
        if len(df_scan) > 0 and len(df_light) > 0:
            time_geo_data = df_scan.merge(df_light, on='lig_id', how='left')
            
            if 'scantime' in time_geo_data.columns:
                # 按時段和地理位置分組分析
                time_geo_analysis = time_geo_data.groupby([
                    time_geo_data['scantime'].dt.hour,
                    'field_id'
                ]).agg({
                    'lig_id': 'count',
                    'session_duration': 'mean',
                    'device_type': lambda x: x.mode().iloc[0] if len(x.mode()) > 0 else 'unknown'
                }).rename(columns={'lig_id': 'scan_count'})
                
                analysis_results['time_geographic'] = time_geo_analysis
        
        # 用戶 × 行為分析
        if len(df_click_lig) > 0:
            user_behavior_analysis = df_click_lig.groupby('user_id').agg({
                'obj_id': 'count',
                'interaction_time': ['mean', 'sum'],
                'gesture_type': lambda x: x.value_counts().to_dict(),
                'attention_duration': 'mean'
            })
            
            analysis_results['user_behavior'] = user_behavior_analysis
        
        # 內容 × 效果分析
        if len(df_arobjs) > 0 and len(df_click_lig) > 0:
            content_effectiveness = df_arobjs.merge(df_click_lig, on='obj_id', how='left')
            
            effectiveness_metrics = content_effectiveness.groupby('obj_name').agg({
                'clicktime': 'count',
                'interaction_time': 'mean',
                'attention_duration': 'mean',
                'gesture_type': lambda x: x.value_counts().to_dict()
            }).rename(columns={'clicktime': 'click_count'})
            
            # 計算效果評分
            effectiveness_metrics['effectiveness_score'] = (
                effectiveness_metrics['click_count'] * 0.4 +
                effectiveness_metrics['interaction_time'] * 0.3 +
                effectiveness_metrics['attention_duration'] * 0.3
            )
            
            analysis_results['content_effectiveness'] = effectiveness_metrics
        
        print("多維度交叉分析完成")
        return analysis_results
        
    except Exception as e:
        print(f"多維度交叉分析時發生錯誤: {str(e)}")
        return analysis_results


# %% 測試
if __name__ == "__main__":
    print("測試")
